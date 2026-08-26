// import Link from "next/link";

// export function Brand({ compact = false }: { compact?: boolean }) {
//   return (
//     <Link href="/" className="brand" aria-label="Ruminate Portal home">
//       <span className="brand-mark" aria-hidden="true">
//         <span>R</span>
//       </span>
//       {!compact && (
//         <span className="brand-copy">
//           <strong>Ruminate</strong>
//           <small>E-Cell IIIT Surat</small>
//         </span>
//       )}
//     </Link>
//   );
// }



import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Ruminate Portal home">
      <span className="brand-mark" aria-hidden="true">
        <Image src="/ruminate-logo.png" alt="" width={40} height={40} priority className="brand-logo" />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>Ruminate</strong>
          <small>E-Cell IIIT Surat</small>
        </span>
      )}
    </Link>
  );
}