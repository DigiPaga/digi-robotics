import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function POST(request: Request) {
  try {
    const { wallet, mimeType, sizeBytes, campaignId } = await request.json();
    if (!wallet || !mimeType) {
      return NextResponse.json(
        { error: "Missing wallet or mimeType" },
        { status: 400 },
      );
    }
    const clip = await prisma.clip.create({
      data: {
        creatorWallet: wallet,
        campaignId: campaignId || null,
        storageKey: `clips/${wallet}/${crypto.randomUUID()}.${mimeType.split("/")[1]}`,
        mimeType,
        sizeBytes: BigInt(sizeBytes || 0),
        status: "PENDING",
        consentVersion: "v1",
        flags: {},
      },
    });
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: clip.storageKey,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
    return NextResponse.json({
      clipId: clip.id,
      uploadUrl,
      storageKey: clip.storageKey,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
