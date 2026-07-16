import sys, json, os
from pathlib import Path
from graphify.llm import extract_corpus_parallel
from graphify.cache import save_semantic_cache

uncached_lines = Path('graphify-out/.graphify_uncached.txt').read_text(encoding='utf-8-sig').splitlines()
uncached_files = [Path(f) for f in uncached_lines if f.strip()]

if uncached_files:
    result = extract_corpus_parallel(uncached_files, backend="gemini")
    Path('graphify-out/.graphify_semantic_new.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
    save_semantic_cache(result.get('nodes', []), result.get('edges', []), result.get('hyperedges', []))
    print(f"Extracted {len(uncached_files)} files using Gemini")
else:
    Path('graphify-out/.graphify_semantic_new.json').write_text(json.dumps({'nodes':[], 'edges':[], 'hyperedges':[], 'input_tokens':0, 'output_tokens':0}, indent=2, ensure_ascii=False), encoding='utf-8')
    print("No files need semantic extraction")

cached = json.loads(Path('graphify-out/.graphify_cached.json').read_text(encoding='utf-8-sig')) if Path('graphify-out/.graphify_cached.json').exists() else {'nodes':[],'edges':[],'hyperedges':[]}
new = json.loads(Path('graphify-out/.graphify_semantic_new.json').read_text(encoding='utf-8-sig')) if Path('graphify-out/.graphify_semantic_new.json').exists() else {'nodes':[],'edges':[],'hyperedges':[]}

all_nodes = cached.get('nodes', []) + new.get('nodes', [])
all_edges = cached.get('edges', []) + new.get('edges', [])
all_hyperedges = cached.get('hyperedges', []) + new.get('hyperedges', [])
seen = set()
deduped = []
for n in all_nodes:
    if n['id'] not in seen:
        seen.add(n['id'])
        deduped.append(n)

merged = {
    'nodes': deduped,
    'edges': all_edges,
    'hyperedges': all_hyperedges,
    'input_tokens': new.get('input_tokens', 0),
    'output_tokens': new.get('output_tokens', 0),
}
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Extraction complete - {len(deduped)} nodes, {len(all_edges)} edges ({len(cached.get("nodes",[]))} from cache, {len(new.get("nodes",[]))} new)')
