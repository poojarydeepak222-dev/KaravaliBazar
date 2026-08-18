import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function Home() {
  return (
    <main style={{fontFamily:'Arial,sans-serif',padding:24,maxWidth:1100,margin:'0 auto'}}>
      <h1>Karavali Bazar</h1>
      <p>Discover local businesses, services and shops in coastal Karnataka.</p>
      <Link to="/businesses">Browse Businesses</Link>
    </main>
  );
}

function Businesses() {
  return (
    <main style={{fontFamily:'Arial,sans-serif',padding:24,maxWidth:1100,margin:'0 auto'}}>
      <Link to="/">← Home</Link>
      <h1>Local Businesses</h1>
      <p>Business listings will appear here.</p>
    </main>
  );
}

export default function App() {
  return <BrowserRouter><Routes><Route path="/" element={<Home />} /><Route path="/businesses" element={<Businesses />} /></Routes></BrowserRouter>;
}
