export const HALL_PLACEHOLDER = "/hall-placeholder.svg";

const LAB_PHOTOS = [
  "https://5.imimg.com/data5/SELLER/Default/2023/2/VK/IN/GH/53708867/computer-on-rent-2-1000x1000.jpg",
  "https://www.centrilinc.com/wp-content/uploads/2021/04/centrilinc-learning-centre-KL-4-scaled.jpg",
  "https://4.imimg.com/data4/XW/IX/GLADMIN-9738652/84-500x500.png",
  "https://i.pinimg.com/736x/d3/af/c9/d3afc9a40dd4f10829a46418e247f7b3.jpg",
  "https://i.pinimg.com/1200x/b4/3f/23/b43f239bcf1a07b443d293cdac9440e2.jpg",
  "https://i.pinimg.com/736x/53/5f/b5/535fb583e0379561edbca15da941d866.jpg",
] as const;

const CLASS_PHOTOS = [
  "https://www.nub.edu.eg/wp-content/uploads/2023/04/%D9%82%D8%A7%D8%B9%D8%A92104-2-scaled.jpg",
  "https://www.nub.edu.eg/wp-content/uploads/2023/04/%D9%82%D8%A7%D8%B9%D8%A92104-scaled.jpg",
  "https://atlona.com/wp-content/uploads/2023/11/auc-case-study-3.jpg",
  "https://thumbs.dreamstime.com/b/generative-ai-modern-university-classroom-interior-rows-desks-projector-screen-concrete-ceiling-busine-business-403481650.jpg?w=768",
  "https://thumbs.dreamstime.com/b/classroom-school-chairs-desk-black-white-36143500.jpg",
  "https://i.pinimg.com/736x/67/12/93/671293b4f0fdb2b1c7dd01def5b817cf.jpg",
  "https://i.pinimg.com/736x/49/16/29/4916290aa47ebd1eb2fcf4a6f181f25a.jpg",
  "https://i.pinimg.com/736x/27/14/4c/27144c93b0f9c2c5b1f7100942ab28c4.jpg",
  "https://i.pinimg.com/1200x/58/43/63/584363e38f7339f6119c270ed47a43b1.jpg",
  "https://i.pinimg.com/736x/aa/7d/f9/aa7df999c04a4ad27ea5ccdc581fe2df.jpg",
  "https://i.pinimg.com/1200x/53/03/67/530367fad8442845d11a694e5f119b68.jpg",
  "https://i.pinimg.com/736x/e7/45/e4/e745e4dae1247f80326ef56fd71c6a95.jpg",
  "https://i.pinimg.com/736x/94/a3/c8/94a3c88827fd102a35ae8f3e4401b697.jpg",
  "https://i.pinimg.com/736x/db/63/ac/db63ac66100dc37cb21ef440a8bc0c0f.jpg",
  "https://i.pinimg.com/1200x/b5/3e/ba/b53eba108d0300a519a7aa9079362e6e.jpg",
  "https://i.pinimg.com/1200x/6b/a2/c1/6ba2c1f1b3a9d5bcd5cf5407bde06258.jpg",
] as const;

const LECTURE_HALL_PHOTOS = [
  "https://th.bing.com/th/id/R.707cd5685a7f6153be9227154fb5998d?rik=b6RIMNiCJb6lQA&pid=ImgRaw&r=0",
  "https://roomfinder.ncl.ac.uk/assets/images/ROM80A3508C-5CF7-4300-9273-86AD372C942D.Lay-2.jpg",
  "https://roomfinder.ncl.ac.uk/assets/images/ROMD386C11A-E7C9-4A83-80BD-7AAAFC9FBCD5.Lay-2.jpg",
  "https://students.ucb.ac.uk/meet-moss-house/img/carousel/lectureRoomOne.png",
  "https://www.lightperceptions.co.uk/wp-content/uploads/2022/02/st-judes-4.jpg",
  "https://ashly.com/wp-content/uploads/2019/03/sldr_full_bg_edu1-1.jpg",
  "https://lawschooltoolbox.com/wp-content/uploads/2018/02/shutterstock_91292342.jpg",
  "https://i.pinimg.com/originals/df/9e/bf/df9ebf1928fb73f968489644d9fbf5f1.jpg",
  "https://i.pinimg.com/736x/23/cf/49/23cf49fb4772166712b3c91d6419d302.jpg",
] as const;

function triplet(pool: readonly string[], start: number): [string, string, string] {
  const n = pool.length;
  return [pool[start % n], pool[(start + 1) % n], pool[(start + 2) % n]];
}

/** Hall name → [primary, carousel 2, carousel 3] using your lab / class / lecture URLs */
export const HALL_PHOTOS: Record<string, readonly [string, string, string]> = {
  // Classrooms (16) — unique primary photo each
  A1: triplet(CLASS_PHOTOS, 0),
  B1: triplet(CLASS_PHOTOS, 1),
  B2: triplet(CLASS_PHOTOS, 2),
  B3: triplet(CLASS_PHOTOS, 3),
  B4: triplet(CLASS_PHOTOS, 4),
  B5: triplet(CLASS_PHOTOS, 5),
  B6: triplet(CLASS_PHOTOS, 6),
  B7: triplet(CLASS_PHOTOS, 7),
  C1: triplet(CLASS_PHOTOS, 8),
  C2: triplet(CLASS_PHOTOS, 9),
  C3: triplet(CLASS_PHOTOS, 10),
  C4: triplet(CLASS_PHOTOS, 11),
  C5: triplet(CLASS_PHOTOS, 12),
  C6: triplet(CLASS_PHOTOS, 13),
  C7: triplet(CLASS_PHOTOS, 14),
  C8: triplet(CLASS_PHOTOS, 15),

  // Lecture halls (5)
  Hall1: triplet(LECTURE_HALL_PHOTOS, 0),
  Hall2: triplet(LECTURE_HALL_PHOTOS, 3),
  Hall3: triplet(LECTURE_HALL_PHOTOS, 6),
  Hall4: triplet(LECTURE_HALL_PHOTOS, 1),
  Hall5: triplet(LECTURE_HALL_PHOTOS, 4),

  // Labs (2)
  "معمل 7": triplet(LAB_PHOTOS, 0),
  "معمل 6": triplet(LAB_PHOTOS, 3),
};

export function photosForHall(hallName: string, hallIndex: number): string[] {
  const set = HALL_PHOTOS[hallName];
  if (set) return [...set];
  const keys = Object.keys(HALL_PHOTOS);
  const key = keys[hallIndex % keys.length];
  return [...(HALL_PHOTOS[key] ?? triplet(CLASS_PHOTOS, 0))];
}
