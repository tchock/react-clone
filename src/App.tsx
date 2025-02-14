import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Signal, signal } from '@preact/signals-core';
import { map } from './map';
import { when } from './when';
import { Suspense } from './suspense';

const Component = ({parentCount}) => {
  const count = signal(1000);
  return <div>some component {count} - {parentCount} <button onClick={() => count.value++}>increase it</button><button onClick={() => parentCount.value++}>increase parent</button></div>
}

const AsyncComponent = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <div>Async component</div>
}

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
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncComponent />
      </Suspense>
      <div className="card">
        <button onClick={() => count.value++} x-data={count}>
          count is {count}
        </button>
        <button onClick={() => count.value--} x-data={count}>
          decrease
        </button>
        {when(
          () => count.value > 10, 
          <Component parentCount={count} />,
          <div>count is less than 10</div>
        )}
        {map(todos, (todo) => (
          <div>
            <div>
              <input value={todo} onKeypress={e => {
                todo.value = e.target.value;
              }} />
            </div>
            <div>{todo}</div>
            <button onClick={() => deleteTodo(todo)}>delete</button>
          </div>
        ))}

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
