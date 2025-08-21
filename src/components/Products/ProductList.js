import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function fetchProducts() {
      const response = await axios.get('https://invoice-56iv.onrender.com/api/products');
      setProducts(response.data.products);
    }
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://invoice-56iv.onrender.com/api/products/${id}`);
      alert('Product deleted');
      setProducts(products.filter((product) => product._id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  return (
    <div>
      <h2>Product List</h2>
      <table>
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Brand</th>
            <th>Item Name</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product._id}>
              <td>{product.itemCode}</td>
              <td>{product.brand}</td>
              <td>{product.itemName}</td>
              <td>{product.unitPrice}</td>
              <td>
                <button onClick={() => handleDelete(product._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
