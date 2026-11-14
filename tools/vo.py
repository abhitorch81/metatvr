import asyncio, edge_tts, json, sys
LINES = {
 'CARD intro': "Multivariable calculus is where many people stop believing maths is visual. Gradient lets you touch it, with just your hands.",
 'Level 1: pinch the orb, carry it to the ring': "No controllers. You pinch the orb, carry it to the ring, and let go.",
 'Surfaces and level curves: drag the ball to the global peak': "Drag the ball up the hill. The white rings are level curves, and the pitch rises as you climb.",
 'When zero curl is not enough: loop a curl-free field': "This field has zero curl everywhere.",
 'A loop that misses the post: circulation is 0': "A loop that misses the post has circulation zero.",
 'Now loop AROUND the post: circulation is 2π, with zero curl': "Loop around the post, and the circulation is two pi, even with zero curl.",
 'A bigger loop gives the same 2π: the hole decides, not the curl': "A bigger loop gives the same answer. The hole decides, not the curl.",
 'Gauss in 3D: flux through a sphere equals the charge inside': "Gauss, in three D. Flux through a sphere equals the charge inside.",
 'Enclose the +2 source: flux about +2': "Wrap the red source, and the flux is about plus two.",
 'Enclose the −2 sink: flux about −2': "Wrap the blue sink, and it is about minus two.",
 'The Field Architect: an AI designs a brand new level': "Now the Field Architect. An A I designs a brand new level.",
 'Pick a topic and a difficulty': "Pick a topic and a difficulty.",
 'It designs, tests with its own simulator, revises, then hands it over': "It drafts a design, checks it in its own simulator, and revises when the check fails. Here the decoy peak was too tall, so it tried again, and the second draft passed.",
 'Level built and verified. Now play it': "The level is built and verified solvable. Now we play it.",
 'Solved: saved to your gallery': "Solved, and saved to your gallery.",
 'Come back daily: streaks, a gallery of AI-made levels, mastery stars': "Come back daily for streaks, a gallery of A I made levels, and mastery stars.",
 'Accessibility: high contrast, large text, hover-to-select': "High contrast, large text, and hover to select, for accessibility.",
 'Gradient: hands-only VR calculus. Play it at metatvr.vercel.app': "Gradient. Hands only V R calculus. Play it free at metatvr dot vercel dot app.",
}
async def main():
    for i, (k, t) in enumerate(LINES.items()):
        await edge_tts.Communicate(t, 'en-US-AriaNeural', rate='+0%').save(f'vo/{i:02d}.mp3')
    json.dump(list(LINES.keys()), open('vo/keys.json', 'w'))
asyncio.run(main())
