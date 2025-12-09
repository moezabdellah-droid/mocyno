
import { Admin, Resource } from 'react-admin';
import { authProvider } from './authProvider';
import dataProvider from './dataProvider';
import Planning from './pages/Planning';
import { ConsigneList, ConsigneCreate, ConsigneEdit, ConsigneShow } from './pages/Consignes';
import { EventList, EventShow } from './pages/Events';
import Payroll from './pages/Payroll';
import { AgentList, AgentCreate, AgentEdit } from './pages/Agents';
import Profile from './pages/Profile';
import Dashboard from './Dashboard';
import { mocynoTheme } from './theme';

import CustomLoginPage from './LoginPage';
import AppLayout from './AppLayout';
import { SiteList, SiteCreate, SiteEdit } from './pages/Sites';



const App = () => (
  <Admin
    authProvider={authProvider}
    dataProvider={dataProvider}
    loginPage={CustomLoginPage}
    layout={AppLayout}
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
