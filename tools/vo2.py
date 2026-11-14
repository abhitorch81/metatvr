import asyncio, edge_tts, json
caps = json.load(open('caps.json')); T = {}
for c in caps: T.setdefault(c['text'], c['t'])
P = [
 ('CARD intro', "Calculus is where many people stop believing maths is visual. Gradient lets you touch it, with just your hands."),
 ('Level 1: pinch the orb, carry it to the ring', "No controllers. You pinch the orb, carry it to the ring, and let go."),
 ('Surfaces and level curves: drag the ball to the global peak', "Drag the ball up the hill. The white rings are level curves, and the pitch rises as you climb."),
 ('When zero curl is not enough: loop a curl-free field', "This field has zero curl everywhere. A loop that misses the post has circulation zero."),
 ('Now loop AROUND the post: circulation is 2π, with zero curl', "Loop around the post, and the circulation is two pi, even with zero curl."),
 ('A bigger loop gives the same 2π: the hole decides, not the curl', "A bigger loop gives the same answer. The hole decides, not the curl."),
 ('Gauss in 3D: flux through a sphere equals the charge inside', "Gauss, in three D. Flux through a sphere equals the charge inside."),
 ('Enclose the +2 source: flux about +2', "Wrap the red source: flux about plus two."),
 ('Enclose the −2 sink: flux about −2', "The blue sink: minus two."),
 ('The Field Architect: an AI designs a brand new level', "Meet the Field Architect. Pick a topic and a difficulty."),
 ('It designs, tests with its own simulator, revises, then hands it over', "It drafts a design, checks it in its own simulator, and revises when the check fails. Here the decoy peak was too tall, so it tried again, and the second draft passed."),
 ('Level built and verified. Now play it', "The level is built and verified solvable. Now we play it."),
 ('Solved: saved to your gallery', "Solved, and saved."),
 ('Come back daily: streaks, a gallery of AI-made levels, mastery stars', "Come back daily: streaks, a gallery, mastery stars."),
 ('Accessibility: high contrast, large text, hover-to-select', "High contrast, large text, and hover to select, for accessibility."),
 ('Gradient: hands-only VR calculus. Play it at metatvr.vercel.app', "Gradient. Hands only V R calculus. Play it free at metatvr dot vercel dot app."),
]
async def main():
    plan = []
    for i, (k, t) in enumerate(P):
        await edge_tts.Communicate(t, 'en-US-AriaNeural').save(f'vo/{i:02d}.mp3'); plan.append([T[k] + 0.35, i, k])
    json.dump(plan, open('vo/plan.json', 'w'))
asyncio.run(main())
