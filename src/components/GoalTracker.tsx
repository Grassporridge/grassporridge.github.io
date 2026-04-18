import { useState, useEffect } from 'react';

interface Goal {
  id: string;
  text: string;
  defaultCompleted?: boolean;
  defaultDate?: string;
}
interface Subsection { title: string; goals: Goal[]; }
interface Section { title: string; direct?: Goal[]; subsections?: Subsection[]; }

const SECTIONS: Section[] = [
  {
    title: 'Overall',
    direct: [
      { id: 'overall-phd', text: 'Get my PhD' },
    ],
  },
  {
    title: 'Fitness',
    direct: [
      { id: 'fitness-weight', text: 'Drop down to 73 Kg' },
    ],
    subsections: [
      {
        title: 'Climbing',
        goals: [
          { id: 'climb-v4', text: 'Climb a V4 Boulder', defaultCompleted: true, defaultDate: 'Feb 10, 2026' },
          { id: 'climb-v5', text: 'Climb a V5 Boulder', defaultCompleted: true, defaultDate: 'Mar 28, 2026' },
          { id: 'climb-v6', text: 'Climb a V6 Boulder' },
          { id: 'climb-v7', text: 'Climb a V7 Boulder' },
          { id: 'climb-5c', text: 'Climb a 5c Route' },
          { id: 'climb-6a', text: 'Climb a 6a+ Route' },
          { id: 'climb-6c', text: 'Climb a 6c Route' },
        ],
      },
      {
        title: 'Weight Lifting',
        goals: [
          { id: 'wl-bench-bw', text: 'Bench bodyweight' },
          { id: 'wl-bench-100', text: 'Bench 100 Kg' },
          { id: 'wl-squat-15', text: 'Squat 1.5x bodyweight' },
          { id: 'wl-squat-100', text: 'Squat 100 Kg' },
          { id: 'wl-dl-140', text: 'Deadlift 140 Kg' },
          { id: 'wl-dl-2x', text: 'Deadlift 2x bodyweight' },
          { id: 'wl-pullup-10', text: '10 Pullups' },
          { id: 'wl-pullup-20', text: 'Weighted Pullup 20 Kg' },
          { id: 'wl-pullup-1arm', text: 'One-armed Pullup' },
        ],
      },
      {
        title: 'Tennis',
        goals: [
          { id: 'tennis-aaron', text: 'Beat Aaron Yip (handicapped to play lefty forehand) in a 5 set, 11 point game' },
        ],
      },
      {
        title: 'Running',
        goals: [
          { id: 'run-mile', text: '6 minute mile' },
          { id: 'run-5k', text: '30 minute 5K' },
          { id: 'run-10k', text: '1 hour 10K' },
          { id: 'run-half', text: 'Run a half-marathon' },
          { id: 'run-full', text: 'Run a full marathon' },
        ],
      },
    ],
  },
  {
    title: 'Piano',
    direct: [
      { id: 'piano-sweden', text: 'Sweden by C418' },
      { id: 'piano-nuvole', text: 'Nuvole Bianche by Ludovico Einaudi' },
      { id: 'piano-chords', text: 'Chords to Blue by Yung Kai' },
    ],
  },
  {
    title: 'Language',
    direct: [
      { id: 'lang-a2', text: 'A2 proficiency in Mandarin' },
      { id: 'lang-b1', text: 'B1 proficiency in Mandarin' },
      { id: 'lang-b2', text: 'B2 proficiency in Mandarin' },
    ],
  },
  {
    title: 'Recreation',
    direct: [
      { id: 'rec-continents', text: 'Visit every continent (Visited: Asia, North America, Africa, Europe)' },
      { id: 'rec-skydive', text: 'Skydive' },
      { id: 'rec-scuba', text: 'Scuba dive' },
      { id: 'rec-shark', text: 'Shark cage dive' },
    ],
  },
];

type State = Record<string, { completed: boolean; date: string }>;

function buildDefaults(): State {
  const state: State = {};
  function processGoal(g: Goal) {
    state[g.id] = {
      completed: g.defaultCompleted ?? false,
      date: g.defaultDate ?? '',
    };
  }
  for (const s of SECTIONS) {
    for (const g of s.direct ?? []) processGoal(g);
    for (const sub of s.subsections ?? []) for (const g of sub.goals) processGoal(g);
  }
  return state;
}

function formatToday() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GoalTracker() {
  const [state, setState] = useState<State>(() => buildDefaults());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('goals-state');
      if (saved) {
        const parsed = JSON.parse(saved) as State;
        setState(prev => {
          const merged = { ...prev };
          for (const id in parsed) if (id in merged) merged[id] = parsed[id];
          return merged;
        });
      }
    } catch {}
    setLoaded(true);
  }, []);

  function toggle(id: string) {
    setState(prev => {
      const cur = prev[id];
      const next = { ...prev, [id]: { completed: !cur.completed, date: !cur.completed ? (prev[id].date || formatToday()) : '' } };
      // preserve defaultDate on re-check if it was a default
      const goal = findGoal(id);
      if (!cur.completed && goal?.defaultDate) next[id].date = goal.defaultDate;
      try { localStorage.setItem('goals-state', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function findGoal(id: string): Goal | undefined {
    for (const s of SECTIONS) {
      for (const g of s.direct ?? []) if (g.id === id) return g;
      for (const sub of s.subsections ?? []) for (const g of sub.goals) if (g.id === id) return g;
    }
  }

  function GoalRow({ goal }: { goal: Goal }) {
    const gs = state[goal.id];
    return (
      <div className="goal-row" onClick={() => toggle(goal.id)}>
        <div className={`checkbox ${gs.completed ? 'checked' : ''}`}>
          {gs.completed && <svg viewBox="0 0 12 12" width="10" height="10"><polyline points="1.5,6 4.5,9 10.5,3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span className={`goal-text ${gs.completed ? 'done' : ''}`}>{goal.text}</span>
        <span className="goal-date">{gs.completed && gs.date ? gs.date : ''}</span>
      </div>
    );
  }

  if (!loaded) return null;

  return (
    <div className="tracker">
      {SECTIONS.map(section => (
        <div key={section.title} className="section">
          <h2 className="section-title">{section.title}</h2>
          {section.direct?.map(g => <GoalRow key={g.id} goal={g} />)}
          {section.subsections?.map(sub => (
            <div key={sub.title} className="subsection">
              <h3 className="subsection-title">{sub.title}</h3>
              {sub.goals.map(g => <GoalRow key={g.id} goal={g} />)}
            </div>
          ))}
        </div>
      ))}

      <style>{`
        .tracker { font-family: system-ui, sans-serif; }

        .section { margin-bottom: 2.5rem; }

        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 1px solid rgba(56,189,183,0.3);
          padding-bottom: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .subsection { margin: 1rem 0 0 1.5rem; }

        .subsection-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #38bdb7;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 0.5rem;
        }

        .goal-row {
          display: grid;
          grid-template-columns: 20px 1fr auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.4rem 0.5rem;
          margin-left: 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .goal-row:hover { background: rgba(255,255,255,0.04); }

        .checkbox {
          width: 16px; height: 16px;
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 3px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: border-color 0.15s, background 0.15s;
          color: #0a0f1e;
        }
        .checkbox.checked { background: #38bdb7; border-color: #38bdb7; }

        .goal-text {
          font-size: 0.9rem;
          color: #c8d0e0;
          line-height: 1.4;
        }
        .goal-text.done {
          text-decoration: line-through;
          color: rgba(200,208,224,0.4);
        }

        .goal-date {
          font-size: 0.78rem;
          color: #38bdb7;
          white-space: nowrap;
          min-width: 110px;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
