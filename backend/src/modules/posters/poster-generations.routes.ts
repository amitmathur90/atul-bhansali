import { generatePosterSchema, publishPosterSchema } from "@abc/shared";
import { Router } from "express";
import { resolveActingCitizenId } from "../../lib/actingCitizen";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { extractHashtags } from "../../lib/hashtags";
import { composePoster } from "../../lib/posterComposer";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const posterGenerationsRouter = Router();

posterGenerationsRouter.post(
  "/",
  requireAuth,
  upload.single("selfie"),
  asyncHandler(async (req, res) => {
    const citizenId = await resolveActingCitizenId(req.user);
    if (!citizenId) throw new AppError(403, "FORBIDDEN", "Only citizens or staff can create a poster");
    if (!req.file) throw new AppError(400, "MISSING_SELFIE", "A selfie photo is required");

    const { templateId, name, city, ward, designation, message } = generatePosterSchema.parse(req.body);
    const template = await prisma.posterTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError(404, "NOT_FOUND", "Poster template not found");

    const templateBuffer = await storageProvider.read(template.imageUrl);
    const resultBuffer = await composePoster(template, templateBuffer, req.file.buffer, {
      name,
      city,
      ward,
      designation,
      message,
    });
    const resultUrl = await storageProvider.upload(
      { buffer: resultBuffer, originalName: "poster.jpg", mimeType: "image/jpeg" },
      "generated-posters",
    );

    const generation = await prisma.posterGeneration.create({
      data: { templateId, citizenId, name, resultUrl },
    });
    res.status(201).json({ id: generation.id, resultUrl });
  }),
);

posterGenerationsRouter.post(
  "/:id/publish",
  requireAuth,
  asyncHandler(async (req, res) => {
    const citizenId = await resolveActingCitizenId(req.user);
    if (!citizenId) throw new AppError(403, "FORBIDDEN", "Only citizens or staff can publish a poster");

    const generation = await prisma.posterGeneration.findUnique({ where: { id: req.params.id } });
    if (!generation) throw new AppError(404, "NOT_FOUND", "Poster not found");
    if (generation.citizenId !== citizenId) throw new AppError(403, "FORBIDDEN", "You can only publish your own poster");

    const { content } = publishPosterSchema.parse(req.body);
    const postContent = content?.trim() || `मैंने अपना पर्सनलाइज़्ड पोस्टर बनाया — ${generation.name}`;

    const post = await prisma.post.create({
      data: {
        authorId: citizenId,
        content: postContent,
        mediaType: "IMAGE",
        mediaUrl: generation.resultUrl,
        hashtags: {
          connectOrCreate: extractHashtags(postContent).map((tag) => ({ where: { tag }, create: { tag } })),
        },
      },
    });
    await prisma.posterGeneration.update({ where: { id: generation.id }, data: { publishedPostId: post.id } });
    res.status(201).json({ postId: post.id });
  }),
);
