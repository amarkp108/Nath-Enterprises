const Course = require('../models/Course');
const mongoose = require('mongoose');

/** Normalize shifts payload from client */
const normalizeShifts = (shifts) => {
  if (!Array.isArray(shifts)) return null;
  return shifts
    .filter((s) => s && String(s.name || '').trim())
    .map((s) => {
      const row = {
        name: String(s.name).trim(),
        startTime: s.startTime ? String(s.startTime).trim() : '',
        endTime: s.endTime ? String(s.endTime).trim() : '',
        isActive: s.isActive !== false && s.isActive !== 'false',
      };
      if (s._id && mongoose.Types.ObjectId.isValid(s._id)) {
        row._id = s._id;
      }
      return row;
    });
};

/** Resolve batch name + id for a course; returns { batch, batchId } or error message */
const resolveStudentBatch = async (courseName, batchId, batchName) => {
  const course = await Course.findOne({ name: courseName });
  if (!course) {
    return { batch: batchName || '', batchId: batchId || null };
  }
  const activeShifts = (course.shifts || []).filter((s) => s.isActive !== false);
  if (activeShifts.length === 0) {
    return { batch: batchName || '', batchId: null };
  }
  if (!batchId) {
    return { error: 'Please select a batch/shift for this course' };
  }
  const shift = course.shifts.id(batchId) || course.shifts.find((s) => String(s._id) === String(batchId));
  if (!shift) {
    return { error: 'Selected batch does not belong to this course' };
  }
  return { batch: shift.name, batchId: shift._id };
};

/** Validate and normalize assignedBatches for an employee */
const resolveAssignedBatches = async (assignedBatches) => {
  if (!Array.isArray(assignedBatches)) return [];
  const result = [];
  for (const item of assignedBatches) {
    if (!item?.courseId || !item?.batchId) continue;
    const course = await Course.findById(item.courseId);
    if (!course) continue;
    const shift = course.shifts.id(item.batchId) || course.shifts.find((s) => String(s._id) === String(item.batchId));
    if (!shift) continue;
    result.push({
      courseId: course._id,
      courseName: course.name,
      batchId: shift._id,
      batchName: shift.name,
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
    });
  }
  return result;
};

const employeeHasBatch = (user, courseName, batchId) => {
  const list = user.assignedBatches || [];
  return list.some(
    (b) =>
      b.courseName === courseName &&
      String(b.batchId) === String(batchId)
  );
};

module.exports = {
  normalizeShifts,
  resolveStudentBatch,
  resolveAssignedBatches,
  employeeHasBatch,
};
