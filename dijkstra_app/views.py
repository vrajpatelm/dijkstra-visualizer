import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .algorithm import run_dijkstra

def index(request):
    return render(request, 'dijkstra_app/index.html')

@csrf_exempt
@require_POST
def dijkstra_api(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    source = data.get('source')
    target = data.get('target')

    if not isinstance(nodes, list) or not nodes:
        return JsonResponse({'error': 'Nodes list cannot be empty.'}, status=400)

    if source not in nodes or target not in nodes:
        return JsonResponse({'error': f'Source "{source}" or Target "{target}" not found in nodes.'}, status=400)

    result = run_dijkstra(nodes, edges, source, target)
    return JsonResponse(result)
