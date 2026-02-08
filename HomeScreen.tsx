'use client'

import { useEffect, useState, useRef, useCallback } from "react";
import { StoryBar } from "./StoryBar";
import { PostCard } from "./PostCard";
import { Post } from "./types";
import appwriteService from "./appwriteService";

export function HomeScreen() {
  const [currentUserId