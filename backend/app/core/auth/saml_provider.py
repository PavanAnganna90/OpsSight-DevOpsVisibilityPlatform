"""
SAML 2.0 Authentication Provider.

This module provides SAML 2.0 SSO authentication support for enterprise
integration, including metadata generation, authentication request handling,
and response validation.
"""

from typing import Dict, Optional, Any, Union, List
from dataclasses import dataclass
from urllib.parse import urlparse, parse_qs
import base64
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import secrets
import hashlib
import hmac

try:
    from onelogin.saml2.auth import OneLogin_Saml2_Auth
    from onelogin.saml2.settings import OneLogin_Saml2_Settings
    from onelogin.saml2.utils import OneLogin_Saml2_Utils
    SAML_AVAILABLE = True
except ImportError:
    SAML_AVAILABLE = False
    OneLogin_Saml2_Auth = Any  # Type hint fallback
    OneLogin_Saml2_Settings = Any  # Type hint fallback
    OneLogin_Saml2_Utils = Any  # Type hint fallback

from app.core.config.settings import settings


@dataclass
class SAMLUserInfo:
    """SAML user information extracted from assertion."""
    name_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    groups: Optional[List[str]] = None
    attributes: Optional[Dict[str, Any]] = None
    session_index: Optional[str] = None


class SAMLError(Exception):
    """SAML-specific error."""
    pass


class SAMLProvider:
    """SAML 2.0 Authentication Provider."""
    
    def __init__(self):
        if not SAML_AVAILABLE:
            raise ImportError("python3-saml library is required for SAML support")
        
        self.settings = self._load_saml_settings()
    
    def _load_saml_settings(self) -> Dict[str, Any]:
        """Load SAML settings configuration."""
        return {
            "strict": True,
            "debug": settings.DEBUG,
            "sp": {
                "entityId": settings.SAML_SP_ENTITY_ID,
                "assertionConsumerService": {
                    "url": settings.SAML_ACS_URL,
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                },
                "singleLogoutService": {
                    "url": settings.SAML_SLS_URL,
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                },
                "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
                "x509cert": "",
                "privateKey": ""
            },
            "idp": {
                "entityId": settings.SAML_IDP_ENTITY_ID,
                "singleSignOnService": {
                    "url": settings.SAML_IDP_SSO_URL,
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                },
                "singleLogoutService": {
                    "url": settings.SAML_IDP_SLO_URL,
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                },
                "x509cert": settings.SAML_IDP_X509_CERT
            }
        }
    
    def _init_saml_request(self, req: Dict[str, Any]) -> OneLogin_Saml2_Auth:
        """Initialize SAML authentication request."""
        return OneLogin_Saml2_Auth(req, self.settings)
    
    def _prepare_flask_request(self, url: str, method: str = 'GET', 
                              form_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Prepare request object for SAML library."""
        parsed_url = urlparse(url)
        return {
            'https': 'on' if parsed_url.scheme == 'https' else 'off',
            'http_host': parsed_url.netloc,
            'server_port': str(parsed_url.port) if parsed_url.port else ('443' if parsed_url.scheme == 'https' else '80'),
            'script_name': parsed_url.path,
            'get_data': parse_qs(parsed_url.query),
            'post_data': form_data or {},
            'request_method': method
        }
    
    def get_login_url(self, return_to: Optional[str] = None) -> str:
        """Generate SAML SSO login URL."""
        req = self._prepare_flask_request(settings.SAML_ACS_URL)
        auth = self._init_saml_request(req)
        return auth.login(return_to=return_to)
    
    def get_logout_url(self, return_to: Optional[str] = None, 
                      name_id: Optional[str] = None, 
                      session_index: Optional[str] = None) -> str:
        """Generate SAML SLO logout URL."""
        req = self._prepare_flask_request(settings.SAML_SLS_URL)
        auth = self._init_saml_request(req)
        return auth.logout(return_to=return_to, name_id=name_id, session_index=session_index)
    
    def process_response(self, saml_response: str, request_id: Optional[str] = None) -> SAMLUserInfo:
        """Process SAML response and extract user information."""
        req = self._prepare_flask_request(
            settings.SAML_ACS_URL, 
            'POST', 
            {'SAMLResponse': saml_response}
        )
        auth = self._init_saml_request(req)
        
        auth.process_response(request_id=request_id)
        
        errors = auth.get_errors()
        if errors:
            raise SAMLError(f"SAML response processing failed: {'; '.join(errors)}")
        
        if not auth.is_authenticated():
            raise SAMLError("SAML authentication failed")
        
        attributes = auth.get_attributes()
        return SAMLUserInfo(
            name_id=auth.get_nameid(),
            email=self._get_attribute_value(attributes, 'email') or auth.get_nameid(),
            first_name=self._get_attribute_value(attributes, 'first_name'),
            last_name=self._get_attribute_value(attributes, 'last_name'),
            full_name=self._get_attribute_value(attributes, 'full_name'),
            groups=self._get_attribute_values(attributes, 'groups'),
            attributes=attributes,
            session_index=auth.get_session_index()
        )
    
    def _get_attribute_value(self, attributes: Dict[str, List[str]], 
                           key: str) -> Optional[str]:
        """Get single attribute value from SAML attributes."""
        values = attributes.get(key, [])
        return values[0] if values else None
    
    def _get_attribute_values(self, attributes: Dict[str, List[str]], 
                            key: str) -> Optional[List[str]]:
        """Get multiple attribute values from SAML attributes."""
        return attributes.get(key)
    
    def get_metadata(self) -> str:
        """Generate SP metadata XML."""
        saml_settings = OneLogin_Saml2_Settings(self.settings)
        metadata = saml_settings.get_sp_metadata()
        errors = saml_settings.check_sp_metadata(metadata)
        
        if errors:
            raise SAMLError(f"Invalid SP metadata: {'; '.join(errors)}")
        
        return metadata
    
    def process_slo_request(self, slo_request: str) -> str:
        """Process SAML Single Logout request."""
        req = self._prepare_flask_request(
            settings.SAML_SLS_URL, 
            'GET', 
            {'SAMLRequest': slo_request}
        )
        auth = self._init_saml_request(req)
        
        return auth.process_slo(delete_session_cb=lambda: None)
    
    def validate_signature(self, signed_data: str, signature: str) -> bool:
        """Validate SAML signature using IdP certificate."""
        try:
            return OneLogin_Saml2_Utils.validate_sign(
                signed_data, 
                signature, 
                settings.SAML_IDP_X509_CERT
            )
        except Exception:
            return False


class SimpleSAMLProvider:
    """
    Simplified SAML provider for basic SAML handling without external dependencies.
    
    This is a fallback implementation when python3-saml is not available.
    It provides basic SAML request generation and response parsing.
    """
    
    def __init__(self):
        self.sp_entity_id = getattr(settings, 'SAML_SP_ENTITY_ID', 'opsight-sp')
        self.acs_url = getattr(settings, 'SAML_ACS_URL', 'http://localhost:8000/auth/saml/acs')
        self.idp_sso_url = getattr(settings, 'SAML_IDP_SSO_URL', '')
        self.idp_entity_id = getattr(settings, 'SAML_IDP_ENTITY_ID', '')
    
    def get_login_url(self, return_to: Optional[str] = None) -> str:
        """Generate basic SAML authentication request URL."""
        if not self.idp_sso_url:
            raise SAMLError("SAML IdP SSO URL not configured")
        
        # Generate basic SAML AuthnRequest
        request_id = f"_{secrets.token_hex(16)}"
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        authn_request = f"""
        <samlp:AuthnRequest 
            xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
            xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
            ID="{request_id}"
            Version="2.0"
            IssueInstant="{timestamp}"
            Destination="{self.idp_sso_url}"
            AssertionConsumerServiceURL="{self.acs_url}">
            <saml:Issuer>{self.sp_entity_id}</saml:Issuer>
        </samlp:AuthnRequest>
        """
        
        # Base64 encode the request
        encoded_request = base64.b64encode(authn_request.encode()).decode()
        
        # Return URL with SAMLRequest parameter
        return f"{self.idp_sso_url}?SAMLRequest={encoded_request}"
    
    def process_response(self, saml_response: str) -> SAMLUserInfo:
        """Basic SAML response processing."""
        try:
            # Decode base64 response
            decoded_response = base64.b64decode(saml_response).decode()
            
            # Parse XML
            root = ET.fromstring(decoded_response)
            
            # Extract basic information (simplified parsing)
            namespaces = {
                'saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
                'samlp': 'urn:oasis:names:tc:SAML:2.0:protocol'
            }
            
            # Find NameID
            name_id_elem = root.find('.//saml:NameID', namespaces)
            name_id = name_id_elem.text if name_id_elem is not None else ""
            
            # Find attributes
            attributes = {}
            for attr_elem in root.findall('.//saml:Attribute', namespaces):
                attr_name = attr_elem.get('Name', '')
                attr_values = [val.text for val in attr_elem.findall('saml:AttributeValue', namespaces)]
                attributes[attr_name] = attr_values
            
            return SAMLUserInfo(
                name_id=name_id,
                email=name_id,  # Assume NameID is email
                attributes=attributes
            )
            
        except Exception as e:
            raise SAMLError(f"Failed to process SAML response: {str(e)}")
    
    def get_metadata(self) -> str:
        """Generate basic SP metadata."""
        return f"""<?xml version="1.0"?>
        <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                             entityID="{self.sp_entity_id}">
            <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
                <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                           Location="{self.acs_url}" index="0"/>
            </md:SPSSODescriptor>
        </md:EntityDescriptor>
        """


def get_saml_provider() -> Union[SAMLProvider, SimpleSAMLProvider]:
    """Get appropriate SAML provider based on available dependencies."""
    if SAML_AVAILABLE:
        return SAMLProvider()
    else:
        return SimpleSAMLProvider()