import heapq

def _fmt_num(val):
    if val is None or val == float('inf'):
        return None
    return int(val) if isinstance(val, (int, float)) and float(val).is_integer() else round(float(val), 2)

def run_dijkstra(nodes, edges, source, target):
    graph = {node: [] for node in nodes}
    edge_map = {}

    for edge in edges:
        u = edge.get('from')
        v = edge.get('to')
        if not u or not v or u == v or u not in graph or v not in graph:
            continue
        try:
            w = max(0.01, float(edge.get('weight', 1)))
        except (ValueError, TypeError):
            w = 1.0
        road_name = str(edge.get('name') or f"{u}-{v}")

        pair = (min(u, v), max(u, v))
        if pair not in edge_map or w < edge_map[pair]['weight']:
            edge_map[pair] = {'weight': w, 'name': road_name}

    for (u, v), info in edge_map.items():
        graph[u].append((v, info['weight'], info['name']))
        graph[v].append((u, info['weight'], info['name']))

    distances = {node: float('inf') for node in nodes}
    distances[source] = 0
    previous = {node: None for node in nodes}
    previous_road = {node: None for node in nodes}
    visited = []
    steps = []

    priority_queue = [(0, source)]

    while priority_queue:
        current_dist, current_node = heapq.heappop(priority_queue)

        if current_node in visited:
            continue

        visited.append(current_node)
        relaxed_edges = []
        skipped_edges = []

        for neighbor, weight, road_name in graph[current_node]:
            if neighbor in visited:
                skipped_edges.append({
                    'from': current_node,
                    'to': neighbor,
                    'road_name': road_name,
                    'weight': _fmt_num(weight),
                    'candidate_dist': _fmt_num(current_dist + weight),
                    'existing_dist': _fmt_num(distances[neighbor]),
                    'reason': 'already_settled'
                })
                continue

            new_dist = current_dist + weight
            old_dist = distances[neighbor]

            if new_dist < old_dist:
                distances[neighbor] = new_dist
                previous[neighbor] = current_node
                previous_road[neighbor] = road_name
                heapq.heappush(priority_queue, (new_dist, neighbor))
                relaxed_edges.append({
                    'from': current_node,
                    'to': neighbor,
                    'road_name': road_name,
                    'weight': _fmt_num(weight),
                    'old_dist': _fmt_num(old_dist),
                    'new_dist': _fmt_num(new_dist),
                    'formula': f"{_fmt_num(current_dist)} + {_fmt_num(weight)} = {_fmt_num(new_dist)}"
                })
            else:
                skipped_edges.append({
                    'from': current_node,
                    'to': neighbor,
                    'road_name': road_name,
                    'weight': _fmt_num(weight),
                    'candidate_dist': _fmt_num(new_dist),
                    'existing_dist': _fmt_num(old_dist),
                    'reason': 'not_shorter'
                })

        queue_snapshot = [
            {'node': node, 'dist': _fmt_num(dist)}
            for dist, node in sorted(priority_queue)
            if node not in visited
        ]

        dist_snapshot = {
            node: _fmt_num(distances[node])
            for node in nodes
        }

        steps.append({
            'step': len(steps) + 1,
            'current_node': current_node,
            'current_dist': _fmt_num(current_dist),
            'visited': list(visited),
            'relaxed_edges': relaxed_edges,
            'skipped_edges': skipped_edges,
            'priority_queue': queue_snapshot,
            'distances': dist_snapshot,
            'previous': {k: v for k, v in previous.items() if v is not None},
        })

        if current_node == target:
            break

    shortest_path = []
    route_legs = []

    if distances[target] != float('inf'):
        node = target
        while node is not None:
            shortest_path.insert(0, node)
            prev = previous[node]
            if prev is not None:
                pair = (min(prev, node), max(prev, node))
                road_info = edge_map.get(pair, {})
                route_legs.insert(0, {
                    'from': prev,
                    'to': node,
                    'road': previous_road.get(node) or road_info.get('name', f"{prev}-{node}"),
                    'distance': _fmt_num(road_info.get('weight', 0))
                })
            node = prev

        if not shortest_path or shortest_path[0] != source:
            shortest_path = []
            route_legs = []

    final_dist = _fmt_num(distances[target])

    return {
        'source': source,
        'target': target,
        'shortest_path': shortest_path,
        'shortest_distance': final_dist,
        'route_legs': route_legs,
        'steps': steps,
    }
