import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Signal, signal } from '@preact/signals-core';
import { map } from './map';

function App() {
  const count = signal(0);
  const todos = signal([]);

  const addOnTop = () => {
    todos.value = [signal('Something to do'), ...todos.value];
  }

  const addOnBottom = () => {
    todos.value = [...todos.value, signal('Something to do last')];
  }

  const deleteTodo = (value: Signal) => {
    todos.value = todos.value.filter((val) => val !== value);
  }

  const serializeTodo = () => {
    console.log(JSON.stringify(todos));
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => count.value++} x-data={count}>
          count is {count}
        </button>
        <div>
          {map(todos, (todo) => <div>
            <div>
              <input value={todo} onKeypress={e => {
                todo.value = e.target.value;
              }} />
            </div>
            <div>{todo}</div>
            <button onClick={() => deleteTodo(todo)}>delete</button></div>)}
        </div>

        <button onClick={addOnTop}>Add on top</button>
        <button onClick={addOnBottom}>Add on bottom</button>
        <button onClick={serializeTodo}>Serialize todos</button>
        
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export {
  App,
}
