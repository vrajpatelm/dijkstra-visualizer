from django.urls import path, include

urlpatterns = [
    path('', include('dijkstra_app.urls')),
]
