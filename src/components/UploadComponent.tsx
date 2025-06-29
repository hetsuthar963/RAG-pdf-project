"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from '@clerk/nextjs';
import Link from "next/link";
import { LogInIcon, Inbox, Loader2, Loader } from 'lucide-react'
import React from 'react';
import {useDropzone} from 'react-dropzone';
import { uploadToS3 } from "@/lib/db/s3";
import { useMutation } from "@tanstack/react-query";
import axios from "axios"
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const UploadComponent = () => {

  const router = useRouter();
  const { userId } = useAuth();
  const isAuth = !!userId;
  const [uploading, setUploading] = React.useState(false)
  const { mutate, isPending } = useMutation({
    mutationFn: async ({file_key, file_name}: {file_key: string, file_name: string}) => {
      const response = await axios.post('/api/create-chat', {file_key, file_name});
      return response.data;
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      // console.log(acceptedFiles); 
      const file = acceptedFiles[0] 
      if (file.size > 10 * 1024 * 1024) {
        // bigger then 10mb
        toast.error("File Too large!")
        // alert('Pleased Upload a smaller file under 10mb only!')
        return
      }

      try {
        setUploading(true)
        const data = await uploadToS3(file)
        if (!data?.file_key || !data.file_name) {
          toast.error("Something went wrong!")
          // alert("Something went wrong!")
          return;
        }
        mutate(data, {
          onSuccess: ({chat_id}) => {
            // console.log(data);
            toast.success("Chat Created!")
            router.push(`/chat/${chat_id}`)
          },
          onError: (err) => {
            toast.error("Error creating chat!")
          }
        })
        // console.log("data", data);
        
      } catch (error) {
        console.log(error);
        toast.loading("We are facing issues!")
      } finally {
        setUploading(false)
      }
      
    }, 
  });
    
  return (
    <div className="w-full mt-4">
      {isAuth ? (
        <div className="p-2 bg-white rounded-xl">
          <div {...getRootProps({
            className: 'border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col',
          })}>
            <input {...getInputProps()}/>
            {uploading || isPending ? (
              <>
              {/* loading state */}
              <Loader className="h-10 w-10 text-blue-500 animate-spin"/>
              <p className="mt-2 text-sm text-slate-400 ">Grilling your paper...</p>
              </> 
            ) : (
              <>
              <Inbox className="w-10 h-10 text-neutral-400" />
              <p className="mt-2 font-bold text-sm text-slate-400">Drop PDF here</p>
            </>
            )}
          </div>
        </div>
      ): (
        <Link href={'/sign-in '}>
            <Button>Login to get Started <LogInIcon /> </Button>
        </Link>
      )}
    </div>
  );
}; 

export default UploadComponent;