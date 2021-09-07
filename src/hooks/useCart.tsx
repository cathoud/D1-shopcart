import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    //Buscar dados do localStorage
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {   
      let updatedCart = [] as Product[];
      const itemIndex =  cart.findIndex(item => item.id === productId)
      
      const inStock = (await api.get('/stock/' + productId)).data.amount > (~itemIndex ? cart[itemIndex].amount : 0);

      if(!inStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if(~itemIndex) {
        updatedCart = cart.map((item, index) => {
          if(index === itemIndex) {
            return {
              ...item,
              amount: item.amount + 1
            }
          }
          return item
        })
      } else {
        const { data: product } = await api.get("/products/" + productId)
        updatedCart = [...cart, { ...product, amount: 1}]
      }
      
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      let updatedCart = cart.filter(item => item.id !== productId)

      if(updatedCart.length === cart.length) {
        toast.error('Erro na remoção do produto');  
      } else {
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const inStock = (await api.get('/stock/' + productId)).data.amount >= amount

      if(!inStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      let updatedCart = [] as Product[];
      const itemIndex =  cart.findIndex(item => item.id === productId)
      
      if(~itemIndex && amount >= 1) {
        
        updatedCart = cart.map(item => ({
          ...item,
          ...(item.id === productId ? {amount}: {})
        }))
        
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        
      } else {
        toast.error('Erro na alteração de quantidade do produto');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
