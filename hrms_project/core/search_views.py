"""Views for the advanced search API."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.engines.search_engine import SearchEngine
from employees.serializers import EmployeeListSerializer
from documents.serializers import DocumentListSerializer


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def advanced_search_view(request):
    """Combined search across employees and documents."""
    if request.method == 'POST':
        data = request.data
    else:
        data = {
            'query': request.query_params.get('q', ''),
            'type': request.query_params.get('type', 'all'),
        }
    company = _get_company(request)
    results = SearchEngine.advanced_search(data, company)
    response = {}
    if 'employees' in results:
        response['employees'] = EmployeeListSerializer(results['employees'], many=True).data
    if 'documents' in results:
        response['documents'] = DocumentListSerializer(results['documents'], many=True).data
    return Response(response)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_employees_view(request):
    """Search employees with filters."""
    query = request.query_params.get('q', '')
    filters = {k: v for k, v in request.query_params.items() if k not in ('q', 'page', 'page_size')}
    company = _get_company(request)
    employees = SearchEngine.search_employees(query, filters, company)[:50]
    return Response(EmployeeListSerializer(employees, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_documents_view(request):
    """Search documents with filters."""
    query = request.query_params.get('q', '')
    filters = {k: v for k, v in request.query_params.items() if k not in ('q', 'page', 'page_size')}
    company = _get_company(request)
    documents = SearchEngine.search_documents(query, filters, company)[:50]
    return Response(DocumentListSerializer(documents, many=True).data)