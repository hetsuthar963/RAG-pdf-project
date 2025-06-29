
import { Button } from "@/components/ui/button";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';
import ClientComponent from '@/components/ClientComponent'; 
import UploadComponent from "@/components/UploadComponent";

export default function Home() {
  return (
    <div className="w-screen min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500 via-white-600 to-white-600">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center">
            <h1 className="mr-3 text-5xl font-semibold">
              🗣️ Talk to your  Question Paper
            </h1>
            <UserButton afterSwitchSessionUrl="/"/>
          </div>

          {/* Render the client component */}
           <ClientComponent /> 
          <p className="max-w-xl mt-1 text-lg">
          Learn What Matters – Extract Repeated Questions Instantly!”
          </p>
           <UploadComponent /> 
        </div>
      </div>
    </div>
  );
}

// export default function Page() {
//   return <div>Hello World</div>;
// }




// // app/page.tsx
// "use client";

// import { UserButton } from "@clerk/nextjs";
// import ClientComponent from "@/components/ClientComponent";
// import UploadComponent from "@/components/UploadComponent";

// export default function Home() {
//   return (
//     <div className="w-screen min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500 via-white-600 to-white-600">
//       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
//         <div className="flex flex-col items-center text-center space-y-4">
//           <div className="flex items-center">
//             <h1 className="mr-3 text-5xl font-semibold">
//               🗣️ Talk to your Question Paper
//             </h1>
//             <UserButton afterSwitchSessionUrl="/" />
//           </div>

//           <p className="max-w-xl text-lg">
//             Learn What Matters – Extract Repeated Questions Instantly!
//           </p>

//           {/* <ClientComponent />
//           <UploadComponent /> */}
//         </div>
//       </div>
//     </div>
//   );
// }