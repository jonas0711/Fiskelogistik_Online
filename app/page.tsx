/**
 * Homepage komponent
 * Viser login formular som standard
 */

import LoginForm from '../components/LoginForm';

export default function Home() {
  console.log('🏠 Renderer homepage...');
  
  return <LoginForm />;
}
