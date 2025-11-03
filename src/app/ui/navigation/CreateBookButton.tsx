import Link from 'next/link';
import Image from 'next/image';

export default function CreateBookButton() {
  return (
    <div className="actions">
      <button onClick={() => alert('Perform Action!')}>Action</button>
      <Link href="/cart">
          <Image 
            src="/cart-icon.png" 
            alt="Cart" 
            width={24} 
            height={24} 
          />
      </Link>
    </div>
  );
};