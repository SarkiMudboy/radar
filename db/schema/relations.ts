import { relations } from "drizzle-orm";

import { organizations } from "./organizations";
import { milestones } from "./milestones";
import { projectCollaborators } from "./project-collaborators";
import { projects } from "./projects";
import { taskAssignees, taskBlockers, tasks } from "./tasks";
import { roles } from "./roles";
import { userRoles } from "./user-roles";
import { users } from "./users";

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  userRoles: many(userRoles),
  projectCollaborators: many(projectCollaborators),
  taskAssignees: many(taskAssignees),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  collaborators: many(projectCollaborators),
  milestones: many(milestones),
  tasks: many(tasks),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "taskHierarchy",
  }),
  subtasks: many(tasks, {
    relationName: "taskHierarchy",
  }),
  assignees: many(taskAssignees),
  blockers: many(taskBlockers),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignees.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskAssignees.userId],
    references: [users.id],
  }),
}));

export const taskBlockersRelations = relations(taskBlockers, ({ one }) => ({
  task: one(tasks, {
    fields: [taskBlockers.taskId],
    references: [tasks.id],
  }),
}));

export const projectCollaboratorsRelations = relations(
  projectCollaborators,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectCollaborators.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectCollaborators.userId],
      references: [users.id],
    }),
  }),
);
