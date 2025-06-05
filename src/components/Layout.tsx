import Navbar from "./Navbar";
import { User } from "../types/User";

type Props = {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
};

export default function Layout({ user, onLogout, children }: Props) {
  return (
    <div className="bg-gray-700 min-h-screen p-4">
      <Navbar user={user} onLogout={onLogout} />
      {children}
    </div>
  );
}
