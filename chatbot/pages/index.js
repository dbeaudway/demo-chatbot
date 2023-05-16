import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  const chatBox = useRef(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);

  useEffect(() => {
    if (conversation.length > 0) {
      const item = conversation[conversation.length - 1];
      if (item.type == 'query') {
        query(item.message);
        setMessage('');
      }

      chatBox.current.addEventListener('DOMNodeInserted', (event) => {
        const { currentTarget: target } = event;
        target.scroll({ top: target.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [conversation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newMessage = { type: 'query', message };
    setConversation([...conversation, newMessage]);
  };

  const query = async () => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message }),
      });

      if (!res.ok) {
        throw new Error('There was an error submitting this message!');
      }
      const { response } = await res.json();

      setConversation([
        ...conversation,
        { type: 'response', message: response.response },
      ]);
    } catch (err) {
      setConversation([
        ...conversation,
        {
          type: 'response',
          message: 'There was an error, can you try asking again?',
        },
      ]);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Demo Chatbot</title>
        <meta name="description" content="Demo chatbot" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1>Demo Chatbot</h1>
        <div className={styles.chatBox} ref={chatBox}>
          <ul>
            {conversation.map((x, i) => (
              <li key={i} className={styles[x.type]}>
                {x.message}
              </li>
            ))}
          </ul>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit">Submit</button>
        </form>
      </main>
    </div>
  );
}
