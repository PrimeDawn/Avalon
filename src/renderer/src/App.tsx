import { useRef, useState, type JSX } from 'react';
import type { ConnectionState } from '../../shared/contracts';
import { checkConnection } from './connection';

// SPEC-001 writer/plan.html §3.4: this is the technical shell, not the final writing UI.
export function App(): JSX.Element {
  const [state, setState] = useState<ConnectionState>({ status: 'idle' });
  const pending = useRef(false);

  async function handleCheck(): Promise<void> {
    if (pending.current) return;
    pending.current = true;
    setState({ status: 'checking' });
    try {
      const info = await checkConnection(window.avalon);
      setState({ status: 'ready', info });
    } catch {
      setState({ status: 'error', message: '连接失败，请重试' });
    } finally {
      pending.current = false;
    }
  }

  return (
    <main>
      <h1>Avalon</h1>
      <p>工作台已启动</p>
      <button type="button" disabled={state.status === 'checking'} onClick={() => { void handleCheck(); }}>
        检查连接
      </button>
      <p role="status" aria-live="polite">
        {state.status === 'checking' && '正在检查连接…'}
        {state.status === 'ready' && <>连接正常 · {state.info.name} {state.info.version}</>}
        {state.status === 'error' && state.message}
      </p>
    </main>
  );
}
