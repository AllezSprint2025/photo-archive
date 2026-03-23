import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { AdminGate } from "@/components/admin-gate";

// Pages
import Home from "@/pages/home";
import AlbumView from "@/pages/album";
import SuccessPage from "@/pages/success";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminAlbumView from "@/pages/admin/album";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminRoutes() {
  return (
    <AdminGate>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/album/:id" component={AdminAlbumView} />
        <Route component={NotFound} />
      </Switch>
    </AdminGate>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/album/:slug" component={AlbumView} />
        <Route path="/success" component={SuccessPage} />
        <Route path="/admin/*" component={AdminRoutes} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
