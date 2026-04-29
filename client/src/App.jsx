import './App.css'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './theme.js'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Splash from './pages/Splash/index.jsx'
import Layout from './pages/Layout.jsx/index.jsx'
import Home from './pages/Home/index.jsx'
import Profile from './pages/Profile/index.jsx'
import Shop from './pages/Shop/index.jsx'
import Testing from './pages/Testing/index.jsx'
import ShopItemDetails from './pages/Shop/ShopItemDetails.jsx'

function App() {

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path='/splash' element={<Splash/>}/>
          <Route path='/' element={<Layout/>}>
            <Route index element={<Home/>}/>
            <Route path="profile" element={<Profile/>}/>
            <Route path="shop" element={<Shop/>}/>
            <Route path="shop/:id" element={<ShopItemDetails />} />
            <Route path="dev" element={<Testing/>}/>
          </Route>
          <Route path="/dev" element={<Testing/>}/>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
