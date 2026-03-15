import { Admin, Resource } from 'react-admin';
import { authProvider } from './providers/authProvider';
import dataProvider from './providers/dataProvider';
import Planning from './pages/Planning';
import { ConsigneList, ConsigneCreate, ConsigneEdit, ConsigneShow } from './pages/Consignes';
import { EventList, EventShow } from './pages/Events';
import Payroll from './pages/Payroll';
import { AgentList, AgentCreate, AgentEdit } from './pages/Agents';
import Dashboard from './Dashboard';
import { mocynoTheme } from './theme';
import { SiteList, SiteCreate, SiteEdit } from './pages/Sites';
import { ClientList, ClientShow, ClientCreate } from './pages/Clients';
import { DocumentDownloadList } from './pages/DocumentDownloads';
import { ClientRequestList, ClientRequestShow, ClientRequestEdit } from './pages/ClientRequests';
import { ReportList, ReportShow, ReportEdit } from './pages/Reports';
import { DocumentList, DocumentShow } from './pages/Documents';

// Debug proxy — active uniquement en développement local
function withDebugProxy<T extends object>(provider: T): T {
  return new Proxy(provider, {
    get: (target, prop) => {
      const value = target[prop as keyof typeof target];
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          console.log(`[Proxy] Calling ${String(prop)} with:`, args);
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (value as (...a: unknown[]) => unknown).apply(target, args as any);
            console.log(`[Proxy] ${String(prop)} returned:`, result);
            if (result === null || result === undefined) {
              console.error(`[Proxy] VIOLATION: ${String(prop)} returned null/undefined!`);
            }
            return result;
          } catch (error) {
            console.error(`[Proxy] ${String(prop)} threw:`, error);
            throw error;
          }
        };
      }
      return value;
    }
  });
}

const activeProvider = import.meta.env.DEV
  ? withDebugProxy(dataProvider)
  : dataProvider;

const App = () => (
  <Admin
    authProvider={authProvider}
    dataProvider={activeProvider}
    dashboard={Dashboard}
    theme={mocynoTheme}
    requireAuth
  >
    <Resource
      name="planning"
      list={Planning}
      options={{ label: '📅 Planning' }}
    />
    <Resource name="payroll" list={Payroll} options={{ label: '💰 RH & Export' }} />
    <Resource name="agents" list={AgentList} create={AgentCreate} edit={AgentEdit} options={{ label: '👥 Agents' }} />
    <Resource name="sites" list={SiteList} create={SiteCreate} edit={SiteEdit} options={{ label: '🏢 Sites' }} />
    <Resource name="consignes" list={ConsigneList} create={ConsigneCreate} edit={ConsigneEdit} show={ConsigneShow} options={{ label: '📋 Consignes' }} />
    <Resource name="events" list={EventList} show={EventShow} options={{ label: '📝 Main Courante' }} />
    <Resource name="clients" list={ClientList} show={ClientShow} create={ClientCreate} options={{ label: '🤝 Clients' }} />
    {/* A23/A24 — Support & Pilotage resources */}
    <Resource name="reports" list={ReportList} show={ReportShow} edit={ReportEdit} options={{ label: '🔴 Incidents' }} />
    <Resource name="documents" list={DocumentList} show={DocumentShow} options={{ label: '📄 Documents' }} />
    <Resource name="clientRequests" list={ClientRequestList} show={ClientRequestShow} edit={ClientRequestEdit} options={{ label: '📩 Demandes' }} />
    <Resource name="documentDownloads" list={DocumentDownloadList} options={{ label: '📥 Téléchargements' }} />
  </Admin>
);

export default App;
