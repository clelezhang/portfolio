'use client';

import { useState } from 'react';
import EditableChatCanvas from '../EditableChatCanvas';
import { Message } from '@/app/lib/types';

const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'What are the key differences between Python and JavaScript?',
    timestamp: Date.now() - 180000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `Great question! Here are the main differences:

## Syntax and Philosophy

**Python** emphasizes readability with significant whitespace and a "there should be one obvious way to do it" philosophy. **JavaScript** uses curly braces and semicolons, with more flexibility in coding style.

## Type Systems

Python is dynamically typed but emphasizes explicit types with type hints. JavaScript is also dynamically typed but more loosely so - it performs automatic type coercion.

## Use Cases

- **Python**: Data science, machine learning, backend web development, automation
- **JavaScript**: Frontend web development, Node.js backends, full-stack applications

## Execution

Python is typically interpreted, while JavaScript runs in browsers or Node.js runtime environments.`,
    timestamp: Date.now() - 120000,
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'Can you show me a code example?',
    timestamp: Date.now() - 60000,
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: `Sure! Here's a simple function in both languages:

**Python:**
\`\`\`python
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
\`\`\`

**JavaScript:**
\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

Notice how Python uses \`def\` while JavaScript uses \`function\`, and Python's f-strings vs JavaScript's template literals.`,
    timestamp: Date.now() - 30000,
  },
];

export default function EditingDemo() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);

  return (
    <div className="demo-container" style={{ height: '600px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <EditableChatCanvas
        initialMessages={messages}
        onMessagesChange={setMessages}
        demoId="editing-demo"
        hideSettings={true}
      />
    </div>
  );
}

