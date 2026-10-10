// The recurring NPCs get new names every game, so two sessions don't meet the same people.
// The narrator works with the original names everywhere (lore, prompts, written dialogue and the
// offline narrator); `castify` swaps in this session's names on everything players see.
// Each pool keeps the role's pronouns (the witness, commander and captain are women; the fixer
// and the director are men), so the surrounding text still fits.

const ROLES = {
    witness: {
        canonical: { full: 'Ines Calder', first: 'Ines', last: 'Calder' },
        pool: [
            { full: 'Ines Calder', first: 'Ines', last: 'Calder' },
            { full: 'Marta Osei', first: 'Marta', last: 'Osei' },
            { full: 'Lena Duarte', first: 'Lena', last: 'Duarte' },
            { full: 'Rosa Kemal', first: 'Rosa', last: 'Kemal' },
            { full: 'Edith Szabo', first: 'Edith', last: 'Szabo' },
            { full: 'Noor Haddad', first: 'Noor', last: 'Haddad' }
        ]
    },
    fixer: {
        canonical: { full: 'Dex "Static" Moreno', first: 'Dex', nick: '"Static"', last: 'Moreno' },
        pool: [
            { full: 'Dex "Static" Moreno', first: 'Dex', nick: '"Static"', last: 'Moreno' },
            { full: 'Rook "Fuse" Tanaka', first: 'Rook', nick: '"Fuse"', last: 'Tanaka' },
            { full: 'Benny "Patch" Adeyemi', first: 'Benny', nick: '"Patch"', last: 'Adeyemi' },
            { full: 'Cole "Wire" Halvorsen', first: 'Cole', nick: '"Wire"', last: 'Halvorsen' },
            { full: 'Ozzie "Glitch" Ferraro', first: 'Ozzie', nick: '"Glitch"', last: 'Ferraro' },
            { full: 'Sal "Socket" Brennan', first: 'Sal', nick: '"Socket"', last: 'Brennan' }
        ]
    },
    rebelCommander: {
        canonical: { full: 'Rhea Vance', first: 'Rhea', last: 'Vance' },
        pool: [
            { full: 'Rhea Vance', first: 'Rhea', last: 'Vance' },
            { full: 'Nadia Okoro', first: 'Nadia', last: 'Okoro' },
            { full: 'Selene Marsh', first: 'Selene', last: 'Marsh' },
            { full: 'Kira Novak', first: 'Kira', last: 'Novak' },
            { full: 'Talia Reyes', first: 'Talia', last: 'Reyes' }
        ]
    },
    enforcerCaptain: {
        canonical: { full: 'Mara Kessler', first: 'Mara', last: 'Kessler' },
        pool: [
            { full: 'Mara Kessler', first: 'Mara', last: 'Kessler' },
            { full: 'Ilse Varga', first: 'Ilse', last: 'Varga' },
            { full: 'Dana Whitlock', first: 'Dana', last: 'Whitlock' },
            { full: 'Yara Sato', first: 'Yara', last: 'Sato' },
            { full: 'Petra Lindqvist', first: 'Petra', last: 'Lindqvist' }
        ]
    },
    director: {
        canonical: { full: 'Director Hale', last: 'Hale' },
        pool: [
            { full: 'Director Hale', last: 'Hale' },
            { full: 'Director Ashford', last: 'Ashford' },
            { full: 'Director Kincaid', last: 'Kincaid' },
            { full: 'Director Mercer', last: 'Mercer' },
            { full: 'Director Sterling', last: 'Sterling' }
        ]
    }
};

/** A cast for one game: { role: chosen names }. */
export function chooseCast(random = Math.random) {
    return Object.fromEntries(Object.entries(ROLES).map(([role, { pool }]) => [role, pool[Math.floor(random() * pool.length) % pool.length]]));
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Swaps, longest first so a full name goes before its parts: [pattern, replacement].
function swapsFor(cast) {
    const swaps = [];
    for (const [role, { canonical }] of Object.entries(ROLES)) {
        const chosen = cast?.[role];
        if (!chosen || chosen.full === canonical.full) continue;
        for (const part of ['full', 'nick', 'first', 'last']) {
            if (!canonical[part] || !chosen[part]) continue;
            const boundary = part === 'nick' ? '' : '\\b';
            swaps.push([new RegExp(`${boundary}${escape(canonical[part])}${boundary}`, 'g'), chosen[part], canonical[part].length]);
        }
    }
    return swaps.sort((a, b) => b[2] - a[2]);
}

/** Puts this game's NPC names into any text, or every string inside an object or list. */
export function castify(value, cast) {
    if (!cast) return value;
    const swaps = swapsFor(cast);
    if (swaps.length === 0) return value;
    const fix = (item) => {
        if (typeof item === 'string') {
            // One pass per name, through a placeholder, so a new name is never swapped again.
            let text = item;
            const held = [];
            for (const [pattern, replacement] of swaps) {
                text = text.replace(pattern, () => {
                    held.push(replacement);
                    return `\u0000${held.length - 1}\u0000`;
                });
            }
            return text.replace(/\u0000(\d+)\u0000/g, (_, index) => held[Number(index)]);
        }
        if (Array.isArray(item)) return item.map(fix);
        if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, inner]) => [key, fix(inner)]));
        return item;
    };
    return fix(value);
}

export const CAST_ROLES = ROLES;
