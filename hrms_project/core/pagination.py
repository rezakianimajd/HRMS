from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Global pagination: respects the `page_size` query param up to 1000 rows."""

    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000
