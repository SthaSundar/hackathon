from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    """
    Custom exception handler to ensure all API errors return JSON.
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        # Ensure we always return JSON
        custom_response_data = {
            'detail': str(exc) if hasattr(exc, 'detail') else str(exc),
            'status_code': response.status_code
        }
        
        # Add more details if available
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                custom_response_data.update(exc.detail)
            else:
                custom_response_data['detail'] = str(exc.detail)
        
        return Response(custom_response_data, status=response.status_code)
    
    return response

