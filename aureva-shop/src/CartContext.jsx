import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Cart mein item add karne ke liye
  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const exist = prevItems.find((item) => item._id === product._id);
      if (exist) {
        return prevItems.map((item) =>
          item._id === product._id ? { ...exist, quantity: exist.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  // Cart se item hatane ya quantity kam karne ke liye
  const removeFromCart = (productId) => {
    setCartItems((prevItems) => {
      const exist = prevItems.find((item) => item._id === productId);
      if (exist.quantity === 1) {
        return prevItems.filter((item) => item._id !== productId);
      }
      return prevItems.map((item) =>
        item._id === productId ? { ...exist, quantity: exist.quantity - 1 } : item
      );
    });
  };

  // Cart poora khali karne ke liye
  const clearCart = () => setCartItems([]);

  // Total price calculate karne ke liye
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);