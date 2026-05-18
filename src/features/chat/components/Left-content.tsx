'use client';
import { useAuthStore } from "@/features/auth";
import React from "react";

const LeftContent = () => {
  const user = useAuthStore((state) => state);
  console.log(user);
  return <div></div>;
};

export default LeftContent;
