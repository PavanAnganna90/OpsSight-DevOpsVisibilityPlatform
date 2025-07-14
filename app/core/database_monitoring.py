from app.core.monitoring import DB_QUERY_DURATION 

def _record_query_metrics(self, query_duration):
    DB_QUERY_DURATION.labels(query_type=self.query_type).observe(query_duration) 