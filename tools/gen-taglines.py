import random, pathlib, textwrap

EXISTING = [
    "Where the thread is the documentation.",
    "Ask badly. Get answered anyway.",
    "Nine years later, someone finally replies.",
    "Search first. You won't. We know.",
    "The answer was in the third reply all along.",
    "Solved, marked solved, still argued about.",
    "One post, four tangents, zero regrets.",
    "The archive nobody funds and everybody reads.",
    "Faster than the docs. Rougher than the docs.",
    "Every edge case has a username attached.",
    "Read the whole thread. It gets better.",
    "Someone here has already broken it your way.",
    "Necroposting is just long-form memory.",
]

REGULARS = [
    "dev-in-the-bm is always right. It has been checked.",
    "TripleU is a boogy man. Nobody saw him log off.",
    "Ars18 will hack it. Give him the afternoon.",
    "flippy is too normal for this place.",
    "leo buskin is back! Nobody knows from where.",
    "anon fliphones his views twice a thread.",
    "flipadmin makes peace. It lasts a page.",
    "froggy left. Still sad about it.",
    "kosherboys simplicity: one line, no context, correct.",
    "TripleU loves arguing more than winning.",
    "chatzie is oversmart and shows his work.",
    "biden2020prez is a narcesist and admits it.",
    "donbot times are over. Pour one out.",
    "kosherflipper, a mourned loss.",
    "shalom karrs hyperslop, served hourly.",
]

NEW = [
    "Locked for your own good.",
    "Merged into a thread from 2011.",
    "The mods are asleep. Post cursed configs.",
    "Duplicate of a question nobody answered either.",
    "Off-topic by page two. On-topic by page nine.",
    "First reply: why would you want to do that?",
    "Second reply: the actual answer.",
    "Edited 14 times. Still wrong.",
    "Sorted by oldest, because that is where the truth is.",
    "A wiki that argues back.",
    "Bump.",
    "Thread necromancy is a load-bearing feature.",
    "The screenshot is 400x300 and that is final.",
    "Attached: config.txt. Renamed: config.txt.txt.",
    "Works on my machine, documented for yours.",
    "Consensus reached. Nobody agrees.",
    "The FAQ was written from these arguments.",
    "Ten years of institutional memory, badly indexed.",
    "Someone will say: just use the search.",
    "Someone else will find it for you anyway.",
    "Signature longer than the post.",
    "Quoting the entire thread to add: same.",
    "The good stuff is in the replies to the replies.",
    "Page 1 asks. Page 6 answers. Page 7 fights.",
    "Marked resolved by the person who gave up.",
    "A support ticket that talks back.",
    "No SLA. No budget. No downtime either.",
    "Where dead links go to be re-uploaded.",
    "Mirror in the next post, as always.",
    "The last known copy of that firmware lives here.",
    "Someone kept the changelog. It was not the vendor.",
    "Vendor said impossible. Page 3 says otherwise.",
    "Warranty void, thread alive.",
    "Instructions unclear. Thread now 40 pages.",
    "The tutorial is a forum post from 2013.",
    "Still the top result. Still correct.",
    "Google sends you here. So does everyone.",
    "Cached by strangers, forever.",
    "The real docs, written at 2am by volunteers.",
    "Peer review, but the peers are angry.",
    "Every fix here started as a complaint.",
    "Half the answers begin with actually.",
    "The other half begin with: finally, someone asked.",
    "Flame war resolved by a pull request.",
    "We argued for six pages and shipped it.",
    "Strong opinions, loosely versioned.",
    "It is not gatekeeping, it is a reading list.",
    "RTFM, but we wrote the M.",
    "Somebody's homework, somebody's production outage.",
    "Same question. Different decade.",
    "New user, old problem.",
    "Welcome. Lurk first.",
    "Introduce yourself. Nobody will notice.",
    "Post count is not a personality. Allegedly.",
    "Rep points buy nothing and mean everything.",
    "The badge system was a mistake we love.",
    "Achievement unlocked: replied to yourself.",
    "Solved it myself, posting for the archive.",
    "The most useful post is always an edit.",
    "EDIT: fixed it. No further detail.",
    "The three most feared words: never mind, solved.",
    "Please say what you did. Please.",
    "Someone in 2031 needs this thread.",
    "Write it down. That is the whole website.",
    "Institutional memory with a login page.",
    "The oral tradition, but searchable.",
    "Where undocumented behaviour gets documented.",
    "Every workaround has a story and a grudge.",
    "Bug reports that outlived the company.",
    "The product died. The thread did not.",
    "Still maintained by people who do not have to.",
    "Nobody is paid and it still works.",
    "Uptime by stubbornness.",
    "Hosted on hope and a spare box.",
    "The spam filter has seen things.",
    "Captcha solved. Trust unearned.",
    "Your first post is held for review. Sorry.",
    "Mods: unpaid, unthanked, unbothered.",
    "Report button works. Patience varies.",
    "Rule one: search. Rule two: nobody searches.",
    "Read-only until you have read a lot.",
    "Threads that end in a wiki are the best threads.",
    "The best answer has three upvotes and no badge.",
    "Buried on page four: the actual fix.",
    "Sort by controversial for the good engineering.",
    "Long threads are just slow books.",
    "This place is a changelog with feelings.",
    "An archive that answers back.",
    "Version 2.1 broke it. Page 12 fixed it.",
    "Rollback instructions, lovingly maintained.",
    "The upgrade guide nobody was paid to write.",
    "We found the regression before the release notes.",
    "Someone bisected it on a weekend.",
    "Reproduced. Confirmed. Ignored upstream.",
    "Filed upstream. Fixed here first.",
    "The workaround is now the standard.",
    "Undocumented flag, thoroughly documented.",
    "We reverse-engineered the polite way: together.",
    "Ask here before you ask support.",
    "Support asks here too.",
]

lines = EXISTING + REGULARS + NEW
assert len(NEW) == 100, len(NEW)
assert len(set(lines)) == len(lines), "duplicate tagline"

MAX = 78  # two lines of the 40ch measure the layout reserves
too_long = [l for l in lines if len(l) > MAX]
assert not too_long, too_long

# Deterministic shuffle, so the regulars are interleaved through the file rather
# than sitting in a block, and the file stays stable across runs. Seeds are tried
# in order until no two house jokes land within MIN_GAP of each other -- a plain
# shuffle clumps them often enough to be worth rejecting.
MIN_GAP = 3
for seed in range(1, 100000):
    candidate = list(lines)
    random.Random(seed).shuffle(candidate)
    at = sorted(candidate.index(r) for r in REGULARS)
    if min(b - a for a, b in zip(at, at[1:])) >= MIN_GAP:
        lines = candidate
        print(f"seed {seed}: house jokes at {at}")
        break
else:
    raise SystemExit("no seed gave an acceptable spread")

body = "\n".join(f"  {l!r}," .replace("'", '"', 0) for l in lines)
def ts(s):
    return '  "' + s.replace('\\', '\\\\').replace('"', '\\"') + '",'
body = "\n".join(ts(l) for l in lines)

header = f'''/**
 * The line under the wordmark, rotated on a timer.
 *
 * House jokes and forum-shaped one-liners, deliberately shuffled so the
 * regulars are scattered through the rotation instead of arriving in a block.
 * The order here is the order the page walks, and each visit starts at a
 * different point (see `src/client/client.ts`).
 *
 * Keep every line under {MAX} characters: the layout reserves two lines of the
 * 40ch measure and never resizes, so a longer line would be clipped.
 * `test/taglines.test.ts` enforces that.
 */
export const TAGLINES: readonly string[] = [
'''

footer = '''];

if (TAGLINES.length === 0) {
  throw new Error("taglines: the list is empty");
}
'''

pathlib.Path('/home/tripleu/JtechDomains/src/taglines.ts').write_text(header + body + "\n" + footer, encoding='utf-8')
print(f"wrote {len(lines)} taglines (longest {max(len(l) for l in lines)} chars)")
print("first 6 after shuffle:")
for l in lines[:6]: print("   ", l)
