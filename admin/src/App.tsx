import React from 'react';
import { Admin, Resource, CustomRoutes, ResourceProps } from 'react-admin';
import { Route } from 'react-router-dom';
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
import MyLayout from './MyLayout';
import { SiteList, SiteCreate, SiteEdit } from './pages/Sites';

// Wrapper component to check permissions before rendering Planning
const PlanningWithPermissions = (props: ResourceProps) => {
  // This will be handled by React Admin's built-in permission system
  return <Planning {...(props as unknown)} />;
};

const App = () => (
  <Admin
    authProvider={authProvider}
    dataProvider={dataProvider}
    loginPage={CustomLoginPage}
    layout={MyLayout}
    dashboard={Dashboard}
    theme={mocynoTheme}
  >
    <Resource
      name="planning"
      list={PlanningWithPermissions}
      options={{ label: 'Planning' }}
    />
    <Resource name="payroll" list={Payroll} options={{ label: 'RH & Export' }} />
    <Resource name="agents" list={AgentList} create={AgentCreate} edit={AgentEdit} />
    <Resource name="sites" list={SiteList} create={SiteCreate} edit={SiteEdit} />
    <Resource name="consignes" list={ConsigneList} create={ConsigneCreate} edit={ConsigneEdit} show={ConsigneShow} options={{ label: 'Consignes' }} />
    <Resource name="events" list={EventList} show={EventShow} options={{ label: 'Main Courante' }} />
    <CustomRoutes>
      <Route path="/profile" element={<Profile />} />
    </CustomRoutes>
  </Admin>
);

export default App;
