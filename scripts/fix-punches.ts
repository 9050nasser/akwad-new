import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("جاري جلب الحركات من قاعدة البيانات...");
  
  // بنجيب كل الحركات الخاصة بالموظفين مرتبة برقم الموظف ثم الوقت
  const events = await prisma.attendanceEvent.findMany({
    where: { employeeId: { not: null } },
    orderBy: [
      { employeeId: "asc" },
      { at: "asc" }
    ]
  });

  console.log(`تم العثور على ${events.length} حركة. جاري المعالجة...`);

  // هنجمع الحركات بحيث كل موظف وكل يوم يكونوا في مجموعة لوحدهم
  const groupedByDay = new Map<string, typeof events>();

  for (const event of events) {
    if (!event.employeeId) continue;
    
    // استخراج تاريخ اليوم فقط (عشان نصفر الوقت ونربط حركات نفس اليوم ببعض)
    const dateObj = new Date(event.at);
    const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
    const key = `${event.employeeId}_${dateKey}`;
    
    if (!groupedByDay.has(key)) {
      groupedByDay.set(key, []);
    }
    groupedByDay.get(key)!.push(event);
  }

  let updatedCount = 0;

  // اللف على كل يوم لكل موظف وتحديث البصمات
  for (const [key, dayEvents] of groupedByDay.entries()) {
    let isNextIn = true; // البصمة الأولى في اليوم دايماً دخول
    
    for (const event of dayEvents) {
      const expectedKind = isNextIn ? "CHECK_IN" : "CHECK_OUT";
      
      // لو البصمة متسجلة غلط في الداتا بيز، بنصلحها
      if (event.kind !== expectedKind) {
        await prisma.attendanceEvent.update({
          where: { id: event.id },
          data: { kind: expectedKind }
        });
        updatedCount++;
      }
      
      isNextIn = !isNextIn; // نعكس الحالة للبصمة اللي وراها (عشان تبقى خروج)
    }
  }

  console.log(`✅ تم الانتهاء بنجاح! تم تصحيح وتحديث ${updatedCount} حركة في قاعدة البيانات.`);
}

main()
  .catch((e) => {
    console.error("❌ حدث خطأ أثناء التحديث:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });