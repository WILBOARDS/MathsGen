import { useState, useEffect } from "react";

const FRIENDS = [
  { id: "f1", name: "Alicia", status: "Practicing Geometry" },
  { id: "f2", name: "Rohan", status: "Building a timed challenge" },
  { id: "f3", name: "Iris", status: "Reviewing mistakes" },
];

export default function FriendsPage({ user }) {
  const [activeFriendId, setActiveFriendId] = useState(FRIENDS[0].id);
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const activeFriend = FRIENDS.find((friend) => friend.id === activeFriendId);

  useEffect(() => {
    const friend = FRIENDS.find((f) => f.id === activeFriendId);
    setMessages([
      { id: "welcome", sender: friend?.name ?? "Friend", text: "Say hi to start the conversation!" },
    ]);
  }, [activeFriendId]);

  const handleSend = () => {
    const text = draftMessage.trim();
    if (!text) {
      return;
    }

    const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setMessages((current) => [
      ...current,
      { id, sender: user?.displayName || "You", text },
    ]);
    setDraftMessage("");
  };

  return (
    <section className="page-card" aria-labelledby="friends-heading">
      <p className="kicker">Social</p>
      <h2 id="friends-heading" className="page-title">
        Friends Chat
      </h2>
      <p className="page-subtitle">
        Full chat page for focused discussion. A mini popup stays available at
        bottom-right on other pages.
      </p>

      <div className="grid-panels">
        <article className="panel">
          <h3>Friends Online</h3>
          <ul className="data-list">
            {FRIENDS.map((friend) => (
              <li key={friend.id}>
                <div className="inline-row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <strong>{friend.name}</strong>
                    <p className="helper-text">{friend.status}</p>
                  </div>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setActiveFriendId(friend.id)}
                  >
                    Chat
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>Conversation with {activeFriend?.name}</h3>
          <div className="chat-dock-messages" style={{ maxHeight: "220px" }}>
            {messages.map((message) => (
              <p key={message.id}>
                <strong>{message.sender}:</strong> {message.text}
              </p>
            ))}
          </div>
          <div className="chat-dock-composer">
            <input
              type="text"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${activeFriend?.name}`}
            />
            <button type="button" className="button-primary" onClick={handleSend}>
              Send
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
