"""
Audit Log Export Service for comprehensive data export functionality.
"""

import csv
import json
import io
import zipfile
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import xlsxwriter

from app.models.audit_log import AuditLog
from app.services.audit_service import AuditService


class AuditExportService:
    """Service for exporting audit logs in various formats."""
    
    def __init__(self, audit_service: AuditService):
        self.audit_service = audit_service
    
    async def export_logs(
        self,
        format: str,
        filters: Dict[str, Any],
        max_records: int = 50000
    ) -> StreamingResponse:
        """Export audit logs in the specified format."""
        
        # Get audit logs based on filters
        logs, total = await self.audit_service.get_audit_logs(
            limit=max_records,
            offset=0,
            **filters
        )
        
        if not logs:
            raise HTTPException(status_code=404, detail="No audit logs found matching the criteria")
        
        # Generate filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"audit_logs_{timestamp}"
        
        if format.lower() == "csv":
            return await self._export_csv(logs, filename)
        elif format.lower() == "json":
            return await self._export_json(logs, filename)
        elif format.lower() == "xlsx":
            return await self._export_xlsx(logs, filename)
        elif format.lower() == "zip":
            return await self._export_zip(logs, filename)
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
    
    async def _export_csv(self, logs: List[AuditLog], filename: str) -> StreamingResponse:
        """Export audit logs as CSV."""
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        headers = [
            "ID", "Timestamp", "Event Type", "Event Category", "Level", "Message",
            "User ID", "User Email", "User Name", "Session ID", "SSO Provider",
            "IP Address", "User Agent", "Request ID", "Resource Type", "Resource ID",
            "Resource Name", "Organization ID", "Team ID", "Success", "Error Code",
            "Error Message", "Duration (ms)", "Metadata", "Tags", "Compliance Tags"
        ]
        writer.writerow(headers)
        
        # Write data rows
        for log in logs:
            row = [
                log.id,
                log.timestamp.isoformat(),
                log.event_type,
                log.event_category,
                log.level,
                log.message,
                log.user_id or "",
                log.user_email or "",
                log.user_name or "",
                log.session_id or "",
                log.sso_provider or "",
                log.ip_address or "",
                log.user_agent or "",
                log.request_id or "",
                log.resource_type or "",
                log.resource_id or "",
                log.resource_name or "",
                log.organization_id or "",
                log.team_id or "",
                log.success,
                log.error_code or "",
                log.error_message or "",
                log.duration_ms or "",
                json.dumps(log.metadata) if log.metadata else "",
                json.dumps(log.tags) if log.tags else "",
                json.dumps(log.compliance_tags) if log.compliance_tags else ""
            ]
            writer.writerow(row)
        
        output.seek(0)
        
        def iter_csv():
            yield output.getvalue().encode('utf-8')
        
        return StreamingResponse(
            iter_csv(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )
    
    async def _export_json(self, logs: List[AuditLog], filename: str) -> StreamingResponse:
        """Export audit logs as JSON."""
        
        # Convert logs to dictionaries
        log_data = []
        for log in logs:
            log_dict = {
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "event_type": log.event_type,
                "event_category": log.event_category,
                "level": log.level,
                "message": log.message,
                "user_id": log.user_id,
                "user_email": log.user_email,
                "user_name": log.user_name,
                "session_id": log.session_id,
                "sso_provider": log.sso_provider,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "request_id": log.request_id,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "resource_name": log.resource_name,
                "organization_id": log.organization_id,
                "team_id": log.team_id,
                "success": log.success,
                "error_code": log.error_code,
                "error_message": log.error_message,
                "duration_ms": log.duration_ms,
                "metadata": log.metadata,
                "tags": log.tags,
                "compliance_tags": log.compliance_tags,
                "retention_policy": log.retention_policy
            }
            log_data.append(log_dict)
        
        # Create export package
        export_data = {
            "export_info": {
                "generated_at": datetime.utcnow().isoformat(),
                "total_records": len(logs),
                "format": "json",
                "version": "1.0"
            },
            "audit_logs": log_data
        }
        
        json_content = json.dumps(export_data, indent=2, ensure_ascii=False)
        
        def iter_json():
            yield json_content.encode('utf-8')
        
        return StreamingResponse(
            iter_json(),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}.json"}
        )
    
    async def _export_xlsx(self, logs: List[AuditLog], filename: str) -> StreamingResponse:
        """Export audit logs as Excel file."""
        
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        
        # Create main worksheet
        worksheet = workbook.add_worksheet('Audit Logs')
        
        # Define formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#4472C4',
            'font_color': 'white',
            'border': 1
        })
        
        date_format = workbook.add_format({'num_format': 'yyyy-mm-dd hh:mm:ss'})
        success_format = workbook.add_format({'bg_color': '#C6EFCE'})
        error_format = workbook.add_format({'bg_color': '#FFC7CE'})
        
        # Write headers
        headers = [
            "ID", "Timestamp", "Event Type", "Event Category", "Level", "Message",
            "User Email", "User Name", "IP Address", "Resource Type", "Resource Name",
            "Success", "Error Message", "Duration (ms)"
        ]
        
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Write data
        for row, log in enumerate(logs, 1):
            worksheet.write(row, 0, log.id)
            worksheet.write(row, 1, log.timestamp, date_format)
            worksheet.write(row, 2, log.event_type)
            worksheet.write(row, 3, log.event_category)
            worksheet.write(row, 4, log.level)
            worksheet.write(row, 5, log.message)
            worksheet.write(row, 6, log.user_email or "")
            worksheet.write(row, 7, log.user_name or "")
            worksheet.write(row, 8, log.ip_address or "")
            worksheet.write(row, 9, log.resource_type or "")
            worksheet.write(row, 10, log.resource_name or "")
            
            # Apply conditional formatting for success/failure
            cell_format = success_format if log.success else error_format
            worksheet.write(row, 11, "Success" if log.success else "Failed", cell_format)
            
            worksheet.write(row, 12, log.error_message or "")
            worksheet.write(row, 13, log.duration_ms or "")
        
        # Auto-fit columns
        for col in range(len(headers)):
            worksheet.set_column(col, col, 15)
        
        # Create summary worksheet
        summary_ws = workbook.add_worksheet('Summary')
        
        # Count statistics
        total_logs = len(logs)
        success_count = sum(1 for log in logs if log.success)
        error_count = total_logs - success_count
        
        # Event type breakdown
        event_types = {}
        for log in logs:
            event_types[log.event_type] = event_types.get(log.event_type, 0) + 1
        
        # Write summary
        summary_ws.write(0, 0, "Audit Log Export Summary", header_format)
        summary_ws.write(2, 0, "Total Records:", header_format)
        summary_ws.write(2, 1, total_logs)
        summary_ws.write(3, 0, "Successful Events:", header_format)
        summary_ws.write(3, 1, success_count)
        summary_ws.write(4, 0, "Failed Events:", header_format)
        summary_ws.write(4, 1, error_count)
        summary_ws.write(5, 0, "Success Rate:", header_format)
        summary_ws.write(5, 1, f"{(success_count/total_logs*100):.2f}%" if total_logs > 0 else "0%")
        
        # Event type breakdown
        summary_ws.write(7, 0, "Event Type Breakdown", header_format)
        for i, (event_type, count) in enumerate(sorted(event_types.items(), key=lambda x: x[1], reverse=True), 8):
            summary_ws.write(i, 0, event_type)
            summary_ws.write(i, 1, count)
        
        workbook.close()
        output.seek(0)
        
        def iter_xlsx():
            yield output.getvalue()
        
        return StreamingResponse(
            iter_xlsx(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    
    async def _export_zip(self, logs: List[AuditLog], filename: str) -> StreamingResponse:
        """Export audit logs as ZIP file containing multiple formats."""
        
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add CSV export
            csv_response = await self._export_csv(logs, filename)
            csv_content = b''.join([chunk async for chunk in csv_response.body_iterator])
            zip_file.writestr(f"{filename}.csv", csv_content)
            
            # Add JSON export
            json_response = await self._export_json(logs, filename)
            json_content = b''.join([chunk async for chunk in json_response.body_iterator])
            zip_file.writestr(f"{filename}.json", json_content)
            
            # Add Excel export
            xlsx_response = await self._export_xlsx(logs, filename)
            xlsx_content = b''.join([chunk async for chunk in xlsx_response.body_iterator])
            zip_file.writestr(f"{filename}.xlsx", xlsx_content)
            
            # Add metadata file
            metadata = {
                "export_info": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "total_records": len(logs),
                    "formats_included": ["csv", "json", "xlsx"],
                    "version": "1.0"
                },
                "files": [
                    {"name": f"{filename}.csv", "format": "csv", "description": "Comma-separated values format"},
                    {"name": f"{filename}.json", "format": "json", "description": "JSON format with metadata"},
                    {"name": f"{filename}.xlsx", "format": "xlsx", "description": "Excel format with summary"}
                ]
            }
            zip_file.writestr("export_metadata.json", json.dumps(metadata, indent=2))
        
        zip_buffer.seek(0)
        
        def iter_zip():
            yield zip_buffer.getvalue()
        
        return StreamingResponse(
            iter_zip(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}.zip"}
        )
    
    async def generate_compliance_report(
        self,
        framework: str,
        start_date: datetime,
        end_date: datetime,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a compliance report for a specific framework."""
        
        # Get logs for the specified period
        logs, total = await self.audit_service.get_audit_logs(
            start_date=start_date,
            end_date=end_date,
            organization_id=organization_id,
            limit=50000  # Large limit for compliance reporting
        )
        
        # Filter logs relevant to the compliance framework
        framework_logs = []
        for log in logs:
            if log.compliance_tags and any(framework.lower() in tag.lower() for tag in log.compliance_tags):
                framework_logs.append(log)
        
        # Generate report metrics
        total_events = len(logs)
        compliance_events = len(framework_logs)
        
        # Event categorization
        event_categories = {}
        security_events = 0
        authentication_events = 0
        authorization_events = 0
        data_access_events = 0
        
        for log in framework_logs:
            category = log.event_category
            event_categories[category] = event_categories.get(category, 0) + 1
            
            if category == "security":
                security_events += 1
            elif category == "authentication":
                authentication_events += 1
            elif category == "authorization":
                authorization_events += 1
            elif category == "data":
                data_access_events += 1
        
        # Risk assessment based on failed events and security violations
        failed_events = sum(1 for log in framework_logs if not log.success)
        risk_score = min(100, (failed_events / compliance_events * 100) if compliance_events > 0 else 0)
        
        if risk_score < 5:
            risk_level = "Low"
        elif risk_score < 15:
            risk_level = "Medium"
        else:
            risk_level = "High"
        
        # Generate recommendations
        recommendations = []
        if failed_events > compliance_events * 0.1:
            recommendations.append("High failure rate detected - review authentication and authorization policies")
        if security_events > compliance_events * 0.05:
            recommendations.append("Multiple security events detected - enhance monitoring and incident response")
        if data_access_events < compliance_events * 0.1:
            recommendations.append("Consider implementing more granular data access logging")
        
        # Default recommendations
        if not recommendations:
            recommendations = [
                "Maintain current security posture with regular reviews",
                "Continue monitoring for anomalous activity patterns",
                "Ensure audit log retention meets compliance requirements"
            ]
        
        report = {
            "framework": framework,
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat(),
            "summary": {
                "total_events": total_events,
                "compliance_relevant_events": compliance_events,
                "coverage_percentage": round((compliance_events / total_events * 100) if total_events > 0 else 0, 2),
                "failed_events": failed_events,
                "success_rate": round(((compliance_events - failed_events) / compliance_events * 100) if compliance_events > 0 else 100, 2)
            },
            "event_breakdown": {
                "by_category": event_categories,
                "security_events": security_events,
                "authentication_events": authentication_events,
                "authorization_events": authorization_events,
                "data_access_events": data_access_events
            },
            "risk_assessment": {
                "risk_score": round(risk_score, 2),
                "risk_level": risk_level,
                "risk_factors": [
                    f"Failed events: {failed_events}",
                    f"Security violations: {security_events}",
                    f"Coverage: {round((compliance_events / total_events * 100) if total_events > 0 else 0, 1)}%"
                ]
            },
            "recommendations": recommendations,
            "compliance_status": "Compliant" if risk_level == "Low" else "Needs Attention"
        }
        
        return report


async def get_audit_export_service(audit_service: AuditService) -> AuditExportService:
    """Factory function to create audit export service."""
    return AuditExportService(audit_service)