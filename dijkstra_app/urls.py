from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/dijkstra/', views.dijkstra_api, name='dijkstra_api'),
]

