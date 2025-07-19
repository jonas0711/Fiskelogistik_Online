/**
 * Homepage komponent
 * Viser login formular som standard
 */

import LoginForm from '../components/LoginForm';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

export default function Home() {
  console.log(`${LOG_PREFIXES.home} Renderer homepage...`);
  
  return <LoginForm />;
}
