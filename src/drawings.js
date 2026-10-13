// ---------------------------------------------------------------------
//  ნახაზები PDF-დან (ღილაკი „ნახაზი PDF-დან“ ობიექტის ბარათში).
//  სურათები: dist/drawings/<id>.webp — იქმნება tools/render-drawings.mjs-ით (PDF-ის სრული ფურცელი, 3×).
//  furniture — „ZGMF - ავეჯი - Update 2.pdf“, plan — „ZGMP - გეგმები - Update 6.pdf“.
// ---------------------------------------------------------------------
export const DRAWING_PAGES = {
  f03: { pdf: 'furniture', page: 3, sheet: 'ZGMF-01', title: 'ZF-01-1 — ვიტრინა' },
  f04: { pdf: 'furniture', page: 4, sheet: 'ZGMF-02', title: 'ZF-01-5B — PlayStation ვიტრინა' },
  f05: { pdf: 'furniture', page: 5, sheet: 'ZGMF-03', title: 'ZF-01-5A / 5A-2 — PlayStation ვიტრინა' },
  f06: { pdf: 'furniture', page: 6, sheet: 'ZGMF-04', title: 'ZF-01-5A-1 — PlayStation ვიტრინა' },
  f07: { pdf: 'furniture', page: 7, sheet: 'ZGMF-05', title: 'ZF-01-5A, 5A-1, 5A-2, 5B — 3D ხედები' },
  f08: { pdf: 'furniture', page: 8, sheet: 'ZGMF-06', title: 'ZF-01-6 — ვიტრინა ლაითბოქსით' },
  f09: { pdf: 'furniture', page: 9, sheet: 'ZGMF-07', title: 'ZF-01-3 — სმარტ საათების სათავსი' },
  f10: { pdf: 'furniture', page: 10, sheet: 'ZGMF-08', title: 'ZF-02 — სათავსი „O“' },
  f11: { pdf: 'furniture', page: 11, sheet: 'ZGMF-09', title: 'ZF-03-1 — მაგიდა მობილურებისთვის' },
  f12: { pdf: 'furniture', page: 12, sheet: 'ZGMF-10', title: 'ZF-03-2 — მაგიდა ლეპტოპებისთვის' },
  f13: { pdf: 'furniture', page: 13, sheet: 'ZGMF-11', title: 'ZF-03-3 — მაგიდა ლეპტოპებისთვის' },
  f14: { pdf: 'furniture', page: 14, sheet: 'ZGMF-12', title: 'ZF-04 — აქსესუარების სტენდი' },
  f15: { pdf: 'furniture', page: 15, sheet: 'ZGMF-13', title: 'ZF-08 — სალარო' },
  f16: { pdf: 'furniture', page: 16, sheet: 'ZGMF-14', title: 'ZF-05-2 — ბანკის მაგიდა' },
  f17: { pdf: 'furniture', page: 17, sheet: 'ZGMF-15', title: 'ZF-06 — TV სივრცე (1)' },
  f18: { pdf: 'furniture', page: 18, sheet: 'ZGMF-16', title: 'ZF-06 — TV სივრცე (2)' },
  f19: { pdf: 'furniture', page: 19, sheet: 'ZGMF-17', title: 'ZF-07 — TV კუნძული' },
  f20: { pdf: 'furniture', page: 20, sheet: 'ZGMF-18', title: 'ZF-09-1 — ჩეკ-დესკი' },
  f21: { pdf: 'furniture', page: 21, sheet: 'ZGMF-19', title: 'ZF-09-2 ჩეკ-დესკი, ZF-10-2 აუდიო მაგიდა' },
  f22: { pdf: 'furniture', page: 22, sheet: 'ZGMF-20', title: 'ZF-10-2 — აუდიო სისტემების მაგიდა' },
  f23: { pdf: 'furniture', page: 23, sheet: 'ZGMF-21', title: 'ZF-15-2 პალმა, ZF-14-3 კუნძული' },
  f24: { pdf: 'furniture', page: 24, sheet: 'ZGMF-22', title: 'ZF-15-3 — დეკორატიული ლაითბოქსი (გეიმინგი)' },
  f25: { pdf: 'furniture', page: 25, sheet: 'ZGMF-23', title: 'ZF-16-1 — აქსესუარების კედელი' },
  f26: { pdf: 'furniture', page: 26, sheet: 'ZGMF-204', title: 'ZF-16-2 — აქსესუარების კედელი' },
  f27: { pdf: 'furniture', page: 27, sheet: 'ZGMF-25', title: 'ZF-18 სმარტ კედელი, ZF-12 პედესტალი' },
  f28: { pdf: 'furniture', page: 28, sheet: 'ZGMF-26', title: 'ZF-18 / ZF-12 — 3D' },
  f29: { pdf: 'furniture', page: 29, sheet: 'PL-07-2', title: 'ჭერის გეგმა — ნავიგაცია და ლაითბოქსები' },
  f30: { pdf: 'furniture', page: 30, sheet: 'ZGMF-27', title: 'ZF-19-1, 19-2, 19-3, 19-10 — ნავიგაცია' },
  f31: { pdf: 'furniture', page: 31, sheet: 'ZGMF-28', title: 'ZF-19-4, 19-5, 19-6 — ნავიგაცია' },
  f32: { pdf: 'furniture', page: 32, sheet: 'ZGMF-29', title: 'ZF-19-7, 19-8, 19-9 — ნავიგაცია' },
  f33: { pdf: 'furniture', page: 33, sheet: 'ZGMF-30', title: 'ZF-20-1, 20-2 — გრძივი ლაითბოქსები' },
  l02: { pdf: 'lightbox', page: 2, sheet: 'Lightboxes 2', title: 'კედლის ლაითბოქსები — მობილურები' },
  l03: { pdf: 'lightbox', page: 3, sheet: 'Lightboxes 3', title: 'კედლის ლაითბოქსები — სმარტი (+ Dyson ბონუსი)' },
  l04: { pdf: 'lightbox', page: 4, sheet: 'Lightboxes 4', title: 'კედლის ლაითბოქსი — აიტი ტექნიკა' },
  l05: { pdf: 'lightbox', page: 5, sheet: 'Lightboxes 5', title: 'კედლის ლაითბოქსი — ტელევიზორების სივრცე' },
  l07: { pdf: 'lightbox', page: 7, sheet: 'Lightboxes 7', title: 'ვერტიკალური ლაითბოქსები — მობილურები' },
  l08: { pdf: 'lightbox', page: 8, sheet: 'Lightboxes 8', title: 'ვერტიკალური ლაითბოქსები — გეიმინგი' },
  l09: { pdf: 'lightbox', page: 9, sheet: 'Lightboxes 9', title: 'ვერტიკალური ლაითბოქსები — აიტი' },
  l10: { pdf: 'lightbox', page: 10, sheet: 'Lightboxes 10', title: 'ვერტიკალური ლაითბოქსები — სმარტი' },
  p07: { pdf: 'plan', page: 7, sheet: 'ZGMP-06', title: 'ავეჯის მარკირებისა და განთავსების გეგმა' },
  p08: { pdf: 'plan', page: 8, sheet: 'ZGMP-07', title: 'ტიხრების მოწყობის გეგმა' },
  p09: { pdf: 'plan', page: 9, sheet: 'ZGMP-08', title: 'კედლების განშლა — სამღებრო სამუშაოები' },
  p10: { pdf: 'plan', page: 10, sheet: 'ZGMP-09', title: 'იატაკის გეგმა' },
  p11: { pdf: 'plan', page: 11, sheet: 'ZGMP-10', title: 'ჭერის გეგმა — განათების სქემა (რელსები, სანათები, ცხაურები, ლუქები)' },
  p13: { pdf: 'plan', page: 13, sheet: 'ZGMP-12', title: 'ჭერი — წერტ. განათება, სამღებრო სამუშაოები' },
  p12: { pdf: 'plan', page: 12, sheet: 'ZGMP-11', title: 'ჭერის გეგმა — ნავიგაცია და ლაითბოქსები' },
  p15: { pdf: 'plan', page: 15, sheet: 'ZGMP-14', title: 'ფასადი — შესასვლელების განშლა' },
};

// ავეჯის კოდი → ფურცლები (ბოლოს — გეგმა, სადაც ჩანს ადგილი)
export const DRAWINGS_BY_CODE = {
  'ZF-01-1': ['f03', 'p07'], 'ZF-01-7': ['f09', 'p07'], 'ZF-01-6': ['f08', 'p07'],
  'ZF-01-5A': ['f05', 'f07', 'p07'], 'ZF-01-5A-2': ['f05', 'f07', 'p07'], 'ZF-01-5A-1': ['f06', 'f07', 'p07'], 'ZF-01-B': ['f04', 'f07', 'p07'],
  'ZF-02': ['f10', 'p07'], 'ZF-03-1': ['f11', 'p07'], 'ZF-03-2': ['f12', 'p07'], 'ZF-03-3': ['f13', 'p07'],
  'ZF-04': ['f14', 'p07'], 'ZF-08': ['f15', 'p07'], 'ZF-05-2': ['f16', 'p07'], 'ZF-06': ['f17', 'f18', 'p07'],
  'ZF-07': ['f19', 'p07'], 'ZF-09-1': ['f20', 'p07'], 'ZF-09-2': ['f21', 'p07'], 'ZF-10-2': ['f21', 'f22', 'p07'],
  'ZF-15-2': ['f23', 'p07'], 'ZF-14-3': ['f23', 'p07'], 'ZF-15-3': ['f24', 'p07'], 'ZF-16-1': ['f25', 'p07'], 'ZF-16-2': ['f26', 'p07'],
  'ZF-18': ['f27', 'f28', 'p07'], 'ZF-12': ['f27', 'f28', 'p07'],
};

// არქიტექტურული ელემენტები (ბარათის „kind“-ის დასაწყისით) → გეგმის ფურცლები
export const DRAWINGS_BY_KIND = [
  ['გარე კედელი', ['p08', 'p09']], ['შიდა ტიხარი', ['p08', 'p09']], ['კედლის მოპირკეთება', ['p09', 'p08']],
  ['კარი', ['p08']], ['სვეტი', ['p08']], ['ვიტრაჟი', ['p15', 'p08']], ['ფასადი', ['p15', 'p08']],
  ['იატაკის ვინილი', ['p10']], ['იატაკი', ['p10']], ['ჭერი', ['p13']],
];

export function drawingsFor(info) {
  if (!info) return [];
  const ids = info.drawings || DRAWINGS_BY_CODE[info.code] || DRAWINGS_BY_KIND.find(([k]) => (info.kind || '').startsWith(k))?.[1] || [];
  return ids.map((id) => ({ id, ...DRAWING_PAGES[id] }));
}
