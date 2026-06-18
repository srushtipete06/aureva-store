import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // 🔄 1. Initial load ke waqt localStorage se cart items uthao (agar pehle se hain)
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('aureva_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // 💾 2. Jab bhi cartItems badlein, use localStorage mein save kar do
  useEffect(() => {
    localStorage.setItem('aureva_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // ➕ Cart mein item add karne ka logic
  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const exist = prevItems.find((item) => item._id === product._id);
      if (exist) {
        return prevItems.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  // ➖ Cart se item remove/decrease karne ka logic
  const removeFromCart = (productId) => {
    setCartItems((prevItems) => {
      const exist = prevItems.find((item) => item._id === productId);
      if (exist.quantity === 1) {
        return prevItems.filter((item) => item._id !== productId);
      }
      return prevItems.map((item) =>
        item._id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  // 🧹 Cart poora saaf karne ka logic (Order success ke baad ke liye)
  const clearCart = () => {
    setCartItems([]);
  };

  // 💰 Total price calculate karna
  const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);