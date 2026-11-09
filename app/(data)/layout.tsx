import { DataProvider } from '@/lib/data';

/** Everything that reads the local database: setup and the tabs. Welcome and Privacy stay out, so they load fast. */
export default function DataLayout({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
