import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Login from './pages/Login';
import Home from './pages/Home';
import ConsignesPage from './pages/ConsignesPage';
import MyMissions from './pages/MyMissions';
import ReportsPage from './pages/ReportsPage';
import ScanPage from './pages/ScanPage';
import { useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

// ... (abbreviated for brevity)

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

setupIonicReact();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login">
            {user ? <Redirect to="/home" /> : <Login />}
          </Route>
          <Route exact path="/home">
            {user ? <Home /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/planning">
            {user ? <MyMissions /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/consignes">
            {user ? <ConsignesPage /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/reports">
            {user ? <ReportsPage /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/scan">
            {user ? <ScanPage /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
