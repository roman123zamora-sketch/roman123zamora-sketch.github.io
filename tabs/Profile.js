export default function profile(content) {
  content.innerHTML = `
    <section class="panel page">
      <h1>Profile</h1>
      <dl class="profile-stats">
        <div><dt>Chess Elo</dt><dd>Unrated</dd></div>
        <div><dt>4-Player Elo</dt><dd>Unrated</dd></div>
        <div><dt>League</dt><dd>Unranked</dd></div>
        <div><dt>Piece Storage</dt><dd>0</dd></div>
        <div><dt>Bot Stars</dt><dd>0</dd></div>
      </dl>
      <h2>Game history</h2>
      <p class="inset">No games recorded.</p>
    </section>`;
}
