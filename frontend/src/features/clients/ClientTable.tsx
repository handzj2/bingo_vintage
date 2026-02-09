import Link from 'next/link';
import { Client } from './client.types';

export function ClientTable({ clients }: { clients: Client[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>NIN</th>
          <th>Status</th>
          <th>Verified</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {clients.map(c => (
          <tr key={c.id}>
            <td>{c.full_name}</td>
            <td>{c.phone}</td>
            <td>{c.nin}</td>
            <td>{c.status}</td>
            <td>{c.verified ? 'Yes' : 'No'}</td>
            <td>
              <Link href={`/dashboard/clients/${c.id}`}>View</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
