import { useState, useMemo } from 'react';

interface Project {
  title: string;
  summary: string;
  tags: string[];
  date: string;
  image?: string;
}

// ── Add new projects here ────────────────────────────────────────────────────
const PROJECTS: Project[] = [
  // Example — remove or replace when you have a real first project:
  // {
  //   title: 'Inferring microbial interaction networks from time-series data',
  //   summary: 'Used sparse Bayesian regression to reconstruct ecological interaction networks from longitudinal sequencing data in synthetic communities.',
  //   tags: ['Systems Biology', 'Bayesian Modelling', 'Microbial Ecology'],
  //   date: 'May 2026',
  //   image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=160&fit=crop&q=80',
  // },
];

// ── Search helpers ───────────────────────────────────────────────────────────
function tokenize(text: string) {
  return text.toLowerCase().match(/\b\w+\b/g) ?? [];
}

function scoreProject(project: Project, queryWords: string[]): number {
  if (queryWords.length === 0) return 1;
  const haystack = tokenize(`${project.title} ${project.summary} ${project.tags.join(' ')}`);
  let wordHits = 0, totalHits = 0;
  for (const qw of queryWords) {
    const hits = haystack.filter(w => w === qw).length;
    if (hits > 0) { wordHits++; totalHits += hits; }
  }
  // encode as single sortable number: wordHits * 1000 + totalHits
  return wordHits * 1000 + totalHits;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BlogPosts() {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const p of PROJECTS) for (const t of p.tags) s.add(t);
    return [...s].sort();
  }, []);

  const queryWords = useMemo(() => tokenize(query), [query]);

  const filtered = useMemo(() => {
    let list = PROJECTS.filter(p => {
      if (activeTags.size > 0 && !p.tags.some(t => activeTags.has(t))) return false;
      if (queryWords.length > 0 && scoreProject(p, queryWords) === 0) return false;
      return true;
    });
    if (queryWords.length > 0) {
      list = [...list].sort((a, b) => scoreProject(b, queryWords) - scoreProject(a, queryWords));
    }
    return list;
  }, [queryWords, activeTags]);

  function toggleTag(tag: string) {
    setActiveTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  return (
    <div className="blog">
      {/* Search */}
      <input
        className="search"
        type="text"
        placeholder="Search projects..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {/* Tag cloud */}
      {allTags.length > 0 && (
        <div className="tags">
          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag ${activeTags.has(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Project cards */}
      {PROJECTS.length === 0 ? (
        <p className="empty">First project coming soon.</p>
      ) : filtered.length === 0 ? (
        <p className="empty">No projects match your search.</p>
      ) : (
        <div className="cards">
          {filtered.map((p, i) => (
            <div key={i} className="card">
              <div className="card-left">
                <div className="card-header">
                  <span className="card-title">{p.title}</span>
                  <div className="card-tags">
                    {p.tags.map(t => (
                      <span key={t} className="card-tag">{t}</span>
                    ))}
                  </div>
                </div>
                <p className="card-summary">{p.summary}</p>
                <span className="card-date">{p.date}</span>
              </div>
              {p.image && (
                <img className="card-img" src={p.image} alt={p.title} />
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .blog { display: flex; flex-direction: column; gap: 1.5rem; }

        .search {
          width: 100%;
          max-width: 480px;
          padding: 0.6rem 1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(56,189,183,0.25);
          border-radius: 6px;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .search::placeholder { color: #6b7280; }
        .search:focus { border-color: rgba(56,189,183,0.6); }

        .tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }

        .tag {
          padding: 0.3rem 0.85rem;
          border: 1px solid rgba(56,189,183,0.3);
          border-radius: 999px;
          background: transparent;
          color: #9ca3af;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tag:hover { border-color: #38bdb7; color: #38bdb7; }
        .tag.active { background: #38bdb7; border-color: #38bdb7; color: #0a0f1e; font-weight: 600; }

        .empty { color: #6b7280; font-size: 0.9rem; margin-top: 1rem; }

        .cards { display: flex; flex-direction: column; gap: 1rem; }

        .card {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
          padding: 1.25rem 1.5rem;
          border: 1px solid rgba(56,189,183,0.2);
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          transition: background 0.2s, border-color 0.2s;
        }
        .card:hover { background: rgba(56,189,183,0.06); border-color: rgba(56,189,183,0.4); }

        .card-left { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }

        .card-header { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.6rem; }

        .card-title { font-size: 1rem; font-weight: 600; color: #fff; }

        .card-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }

        .card-tag {
          font-size: 0.7rem;
          padding: 0.15rem 0.55rem;
          border: 1px solid rgba(56,189,183,0.3);
          border-radius: 999px;
          color: #38bdb7;
        }

        .card-summary { font-size: 0.88rem; color: #9ca3af; line-height: 1.55; }

        .card-date { font-size: 0.75rem; color: #4b5563; }

        .card-img {
          width: 110px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
          border: 1px solid rgba(56,189,183,0.15);
        }
      `}</style>
    </div>
  );
}
