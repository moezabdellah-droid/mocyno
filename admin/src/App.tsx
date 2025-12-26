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

const App = () => (
  <Admin
    authProvider={authProvider}
    dataProvider={new Proxy(dataProvider, {
      get: (target, prop) => {
        const value = target[prop as keyof typeof target];
        if (typeof value === 'function') {
          return async (...args: any[]) => {
            console.log(`[Proxy] Calling ${String(prop)} with:`, args);
            try {
              const result = await value.apply(target, args as any);
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
    })}
    dashboard={Dashboard}
    theme={mocynoTheme}
  >
    <Resource
      name="planning"
      list={Planning}
      options={{ label: 'Planning' }}
    />
    <Resource name="payroll" list={Payroll} options={{ label: 'RH & Export' }} />
    <Resource name="agents" list={AgentList} create={AgentCreate} edit={AgentEdit} />
    <Resource name="sites" list={SiteList} create={SiteCreate} edit={SiteEdit} />
    <Resource name="consignes" list={ConsigneList} create={ConsigneCreate} edit={ConsigneEdit} show={ConsigneShow} options={{ label: 'Consignes' }} />
    <Resource name="events" list={EventList} show={EventShow} options={{ label: 'Main Courante' }} />
  </Admin>
);

export default App;
