import React, { useState, useEffect } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Floating WhatsApp */}
      <a href="https://wa.me/919421010979" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition">
        <span className="font-sans font-bold">W</span>
      </a>

      {/* Luxury Navbar */}
      <nav className="border-b border-stone-900 bg-black/90 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-widest text-[#D4AF37]">AUREVA</h1>
          <div className="text-xs uppercase tracking-widest text-stone-400">
            <a href="tel:9421010979" className="hover:text-[#D4AF37] transition">📞 9421010979</a>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <header className="py-28 text-center bg-gradient-to-b from-stone-900 to-black border-b border-stone-900">
        <span className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-medium block mb-3">Fine Jewelry Atelier</span>
        <h2 className="text-4xl md:text-6xl text-white font-serif tracking-wide mb-4">Timeless Elegance, Crafted for You</h2>
        <div className="w-16 h-0.5 bg-[#D4AF37] mx-auto mt-6"></div>
      </header>

      {/* Dynamic Products Display */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <h3 className="text-2xl text-center mb-12 tracking-widest text-[#D4AF37] uppercase">The Signature Collection</h3>

        {loading ? (
          <p className="text-center text-stone-500 tracking-widest">Loading luxury...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-12 border border-stone-900 bg-stone-950">
            <p className="text-stone-400 mb-2 font-medium">Database empty hai bhai! 📦</p>
            <p className="text-xs text-stone-600 max-w-md mx-auto">Backend ke `/add-product` route par Postman se data POST karo, naya product yahan realtime mein dikhega.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product._id} className="border border-stone-900 p-4 bg-stone-950 hover:border-[#D4AF37]/40 transition duration-500 group">
                <div className="aspect-square bg-stone-900 mb-4 overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <h4 className="text-lg text-white font-medium mb-1">{product.name}</h4>
                <p className="text-xs text-stone-500 mb-4">{product.description || "Beautifully handcrafted royal design."}</p>
                <div className="flex items-center justify-between pt-2 border-t border-stone-900">
                  <span className="text-[#D4AF37] font-semibold">₹{product.price.toLocaleString('en-IN')}</span>
                  <button className="text-[10px] uppercase tracking-widest bg-[#D4AF37] text-black px-4 py-2 font-bold hover:bg-white transition">Add To Cart</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
